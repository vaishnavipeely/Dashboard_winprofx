from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.schema.inspector import profile_schema_from_engine, safe_sql_identifier
from app.utils.columns import pick_first


def _dt(d: str | None) -> datetime | None:
    if not d:
        return None
    try:
        return datetime.fromisoformat(d.replace("Z", "+00:00"))
    except Exception:
        return None


def _default_range() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    return now - timedelta(days=90), now


def finance_analytics(engine: Engine, start: str | None, end: str | None, user: str | None = None) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    finance_table = prof.roles.get("finance")
    trades_table = prof.roles.get("trades")

    s = _dt(start)
    e = _dt(end)
    if s is None or e is None:
        s, e = _default_range()

    out: dict[str, Any] = {"kpis": {}, "charts": {}, "meta": {"roles": prof.roles}}

    # Net inflow/outflow + revenue trend is best-effort; many schemas differ.
    with engine.connect() as conn:
        if finance_table:
            ft = safe_sql_identifier(finance_table)
            cols = prof.columns_by_table.get(finance_table, [])
            time_col = pick_first(cols, ["time", "created_at", "timestamp", "date"])
            amount_col = pick_first(cols, ["amount", "value", "sum"])
            type_col = pick_first(cols, ["type", "action", "operation"])
            user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])

            where = []
            params: dict[str, Any] = {}
            if time_col:
                tc = safe_sql_identifier(time_col)
                where += [f"{tc} >= :start", f"{tc} < :end"]
                params.update({"start": s, "end": e})
            if user and user_col:
                where.append(f"{safe_sql_identifier(user_col)} = :user")
                params["user"] = user
            where_sql = (" WHERE " + " AND ".join(where)) if where else ""

            # Deposits/withdrawals detection
            deposits = None
            withdrawals = None
            net = None
            if amount_col:
                ac = safe_sql_identifier(amount_col)
                if type_col:
                    ty = safe_sql_identifier(type_col)
                    rows = conn.execute(
                        text(
                            f"""
                            SELECT
                              COALESCE(SUM(CASE WHEN LOWER({ty}) LIKE '%deposit%' THEN {ac} ELSE 0 END),0) AS deposits,
                              COALESCE(SUM(CASE WHEN LOWER({ty}) LIKE '%with%' THEN {ac} ELSE 0 END),0) AS withdrawals
                            FROM {ft}{where_sql}
                            """
                        ),
                        params,
                    ).mappings().first()
                    deposits = float(rows["deposits"])
                    withdrawals = float(rows["withdrawals"])
                    net = deposits - withdrawals
                else:
                    # Without type, provide total amount only
                    total_amount = float(
                        conn.execute(text(f"SELECT COALESCE(SUM({ac}),0) AS v FROM {ft}{where_sql}"), params).mappings().first()["v"]
                    )
                    deposits = total_amount
                    withdrawals = None
                    net = None

            out["kpis"]["totalDeposits"] = deposits
            out["kpis"]["totalWithdrawals"] = withdrawals
            out["kpis"]["netInflowOutflow"] = net

            # Finance trend (daily sum)
            if time_col and amount_col:
                tc = safe_sql_identifier(time_col)
                ac = safe_sql_identifier(amount_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT DATE({tc}) AS d, COALESCE(SUM({ac}),0) AS v
                        FROM {ft}{where_sql}
                        GROUP BY DATE({tc})
                        ORDER BY d
                        """
                    ),
                    params,
                ).mappings().all()
                out["charts"]["cashflowTrend"] = [{"date": str(r["d"]), "value": float(r["v"])} for r in rows]
            else:
                out["charts"]["cashflowTrend"] = []
        else:
            out["kpis"]["totalDeposits"] = None
            out["kpis"]["totalWithdrawals"] = None
            out["kpis"]["netInflowOutflow"] = None
            out["charts"]["cashflowTrend"] = []

        # Profit per user (from trades)
        profit_per_user: list[dict[str, Any]] = []
        if trades_table:
            tt = safe_sql_identifier(trades_table)
            cols = prof.columns_by_table.get(trades_table, [])
            time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
            user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
            profit_col = pick_first(cols, ["profit", "pl", "pnl"])
            if time_col and user_col and profit_col:
                tc = safe_sql_identifier(time_col)
                uc = safe_sql_identifier(user_col)
                pc = safe_sql_identifier(profit_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT {uc} AS userKey, COALESCE(SUM({pc}),0) AS pnl
                        FROM {tt}
                        WHERE {tc} >= :start AND {tc} < :end
                        GROUP BY {uc}
                        ORDER BY pnl DESC
                        LIMIT 25
                        """
                    ),
                    {"start": s, "end": e},
                ).mappings().all()
                profit_per_user = [{"userKey": str(r["userKey"]), "pnl": float(r["pnl"])} for r in rows]
        out["charts"]["profitPerUserTop"] = profit_per_user

    return out

