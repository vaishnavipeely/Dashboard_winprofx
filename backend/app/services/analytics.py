from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.schema.inspector import profile_schema_from_engine, safe_sql_identifier
from app.utils.columns import pick_first


def _dt(d: str | None) -> datetime | None:
    if not d:
        return None
    # Accept YYYY-MM-DD or ISO.
    try:
        return datetime.fromisoformat(d.replace("Z", "+00:00"))
    except Exception:
        return None


def _utc_start_of_day(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


def _default_range() -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=30)
    return start, now


def _table_and_cols(engine: Engine, role: str) -> tuple[str | None, list[str]]:
    prof = profile_schema_from_engine(engine)
    table = prof.roles.get(role)
    if not table:
        return None, []
    return table, prof.columns_by_table.get(table, [])


def schema_summary(engine: Engine) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    return {
        "dialect": prof.dialect,
        "tables": prof.tables,
        "roles": prof.roles,
        "columns_by_table": prof.columns_by_table,
    }


def overview(engine: Engine, start: str | None, end: str | None) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    s = _dt(start)
    e = _dt(end)
    if s is None or e is None:
        s, e = _default_range()

    users_table = prof.roles.get("users")
    trades_table = prof.roles.get("trades")
    finance_table = prof.roles.get("finance")

    out: dict[str, Any] = {"kpis": {}, "charts": {}, "meta": {"roles": prof.roles}}

    with engine.connect() as conn:
        # Total users
        if users_table:
            t = safe_sql_identifier(users_table)
            out["kpis"]["totalUsers"] = conn.execute(text(f"SELECT COUNT(*) AS v FROM {t}")).mappings().first()["v"]
        else:
            out["kpis"]["totalUsers"] = None

        # Trades KPIs
        if trades_table:
            t = safe_sql_identifier(trades_table)
            cols = prof.columns_by_table.get(trades_table, [])
            time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
            profit_col = pick_first(cols, ["profit", "pl", "pnl"])
            volume_col = pick_first(cols, ["volume", "lots"])
            commission_col = pick_first(cols, ["commission"])
            swap_col = pick_first(cols, ["swap"])
            symbol_col = pick_first(cols, ["symbol", "instrument"])

            where = ""
            params: dict[str, Any] = {}
            if time_col:
                where = f" WHERE {safe_sql_identifier(time_col)} >= :start AND {safe_sql_identifier(time_col)} < :end"
                params = {"start": s, "end": e}

            out["kpis"]["totalTrades"] = conn.execute(
                text(f"SELECT COUNT(*) AS v FROM {t}{where}"), params
            ).mappings().first()["v"]

            if volume_col:
                out["kpis"]["totalVolume"] = float(
                    conn.execute(text(f"SELECT COALESCE(SUM({safe_sql_identifier(volume_col)}),0) AS v FROM {t}{where}"), params)
                    .mappings()
                    .first()["v"]
                )
            else:
                out["kpis"]["totalVolume"] = None

            # P/L includes profit + swap - commission where available
            pl_expr_parts = []
            if profit_col:
                pl_expr_parts.append(safe_sql_identifier(profit_col))
            if swap_col:
                pl_expr_parts.append(safe_sql_identifier(swap_col))
            if commission_col:
                pl_expr_parts.append(f"-{safe_sql_identifier(commission_col)}")
            pl_expr = " + ".join(pl_expr_parts) if pl_expr_parts else None

            if pl_expr:
                out["kpis"]["totalProfitLoss"] = float(
                    conn.execute(text(f"SELECT COALESCE(SUM({pl_expr}),0) AS v FROM {t}{where}"), params).mappings().first()["v"]
                )
            else:
                out["kpis"]["totalProfitLoss"] = None

            # Trades per day
            if time_col:
                tc = safe_sql_identifier(time_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT DATE({tc}) AS d, COUNT(*) AS v
                        FROM {t}
                        WHERE {tc} >= :start AND {tc} < :end
                        GROUP BY DATE({tc})
                        ORDER BY d
                        """
                    ),
                    {"start": s, "end": e},
                ).mappings().all()
                out["charts"]["tradesPerDay"] = [{"date": str(r["d"]), "value": int(r["v"])} for r in rows]
            else:
                out["charts"]["tradesPerDay"] = []

            # P/L over time
            if time_col and pl_expr:
                tc = safe_sql_identifier(time_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT DATE({tc}) AS d, COALESCE(SUM({pl_expr}),0) AS v
                        FROM {t}
                        WHERE {tc} >= :start AND {tc} < :end
                        GROUP BY DATE({tc})
                        ORDER BY d
                        """
                    ),
                    {"start": s, "end": e},
                ).mappings().all()
                out["charts"]["profitLossOverTime"] = [{"date": str(r["d"]), "value": float(r["v"])} for r in rows]
            else:
                out["charts"]["profitLossOverTime"] = []

            # Volume distribution by symbol (top 8 + Other)
            if symbol_col and volume_col:
                sc = safe_sql_identifier(symbol_col)
                vc = safe_sql_identifier(volume_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT {sc} AS k, COALESCE(SUM({vc}),0) AS v
                        FROM {t}
                        {where}
                        GROUP BY {sc}
                        ORDER BY v DESC
                        LIMIT 8
                        """
                    ),
                    params,
                ).mappings().all()
                out["charts"]["volumeDistribution"] = [{"name": str(r["k"]), "value": float(r["v"])} for r in rows]
            else:
                out["charts"]["volumeDistribution"] = []
        else:
            out["kpis"]["totalTrades"] = None
            out["kpis"]["totalVolume"] = None
            out["kpis"]["totalProfitLoss"] = None
            out["charts"]["tradesPerDay"] = []
            out["charts"]["profitLossOverTime"] = []
            out["charts"]["volumeDistribution"] = []

        # Finance: broker revenue proxy (commission/spread) from trades if available; else from finance table if it has fee/commission
        broker_revenue = None
        if trades_table:
            cols = prof.columns_by_table.get(trades_table, [])
            commission_col = pick_first(cols, ["commission"])
            if commission_col:
                t = safe_sql_identifier(trades_table)
                time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
                where = ""
                params = {}
                if time_col:
                    where = f" WHERE {safe_sql_identifier(time_col)} >= :start AND {safe_sql_identifier(time_col)} < :end"
                    params = {"start": s, "end": e}
                broker_revenue = float(
                    conn.execute(
                        text(f"SELECT COALESCE(SUM({safe_sql_identifier(commission_col)}),0) AS v FROM {t}{where}"), params
                    )
                    .mappings()
                    .first()["v"]
                )
        if broker_revenue is None and finance_table:
            cols = prof.columns_by_table.get(finance_table, [])
            fee_col = pick_first(cols, ["fee", "commission", "spread"])
            if fee_col:
                t = safe_sql_identifier(finance_table)
                broker_revenue = float(
                    conn.execute(text(f"SELECT COALESCE(SUM({safe_sql_identifier(fee_col)}),0) AS v FROM {t}")).mappings().first()["v"]
                )
        out["kpis"]["brokerRevenue"] = broker_revenue

        # Active traders proxy: distinct users with trades in last 30d
        active_traders = None
        if trades_table:
            cols = prof.columns_by_table.get(trades_table, [])
            user_col = pick_first(cols, ["user_id", "userid", "login", "account", "client_id"])
            time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
            if user_col and time_col:
                t = safe_sql_identifier(trades_table)
                uc = safe_sql_identifier(user_col)
                tc = safe_sql_identifier(time_col)
                active_traders = int(
                    conn.execute(
                        text(f"SELECT COUNT(DISTINCT {uc}) AS v FROM {t} WHERE {tc} >= :start AND {tc} < :end"),
                        {"start": s, "end": e},
                    )
                    .mappings()
                    .first()["v"]
                )
        out["kpis"]["activeTraders"] = active_traders

        # Trades today (UTC)
        trades_today = None
        if trades_table:
            cols = prof.columns_by_table.get(trades_table, [])
            time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
            if time_col:
                t = safe_sql_identifier(trades_table)
                tc = safe_sql_identifier(time_col)
                start_today = _utc_start_of_day(datetime.now(timezone.utc))
                end_today = start_today + timedelta(days=1)
                trades_today = int(
                    conn.execute(
                        text(f"SELECT COUNT(*) AS v FROM {t} WHERE {tc} >= :start AND {tc} < :end"),
                        {"start": start_today, "end": end_today},
                    )
                    .mappings()
                    .first()["v"]
                )
        out["kpis"]["totalTradesToday"] = trades_today

    return out

