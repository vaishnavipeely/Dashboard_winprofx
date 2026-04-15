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


def users_analytics(engine: Engine, start: str | None, end: str | None) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    users_table = prof.roles.get("users")
    trades_table = prof.roles.get("trades")

    s = _dt(start)
    e = _dt(end)
    if s is None or e is None:
        s, e = _default_range()

    out: dict[str, Any] = {"kpis": {}, "charts": {}, "tables": {}, "meta": {"roles": prof.roles}}

    with engine.connect() as conn:
        # User growth trend
        if users_table:
            t = safe_sql_identifier(users_table)
            cols = prof.columns_by_table.get(users_table, [])
            created_col = pick_first(cols, ["created_at", "registration", "reg_date", "created", "time"])
            if created_col:
                cc = safe_sql_identifier(created_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT DATE({cc}) AS d, COUNT(*) AS v
                        FROM {t}
                        WHERE {cc} >= :start AND {cc} < :end
                        GROUP BY DATE({cc})
                        ORDER BY d
                        """
                    ),
                    {"start": s, "end": e},
                ).mappings().all()
                out["charts"]["newUsersDaily"] = [{"date": str(r["d"]), "value": int(r["v"])} for r in rows]
            else:
                out["charts"]["newUsersDaily"] = []
        else:
            out["charts"]["newUsersDaily"] = []

        # Active vs inactive (active = traded in range)
        active = None
        inactive = None
        if users_table and trades_table:
            ucols = prof.columns_by_table.get(users_table, [])
            tcols = prof.columns_by_table.get(trades_table, [])
            user_id_u = pick_first(ucols, ["user_id", "id", "login", "account"])
            user_id_t = pick_first(tcols, ["user_id", "login", "account", "client_id"])
            time_col = pick_first(tcols, ["close_time", "time", "timestamp", "open_time"])
            if user_id_u and user_id_t and time_col:
                ut = safe_sql_identifier(users_table)
                tt = safe_sql_identifier(trades_table)
                ucu = safe_sql_identifier(user_id_u)
                uct = safe_sql_identifier(user_id_t)
                tc = safe_sql_identifier(time_col)
                active = int(
                    conn.execute(
                        text(
                            f"""
                            SELECT COUNT(DISTINCT u.{ucu}) AS v
                            FROM {ut} u
                            JOIN {tt} t ON t.{uct} = u.{ucu}
                            WHERE t.{tc} >= :start AND t.{tc} < :end
                            """
                        ),
                        {"start": s, "end": e},
                    )
                    .mappings()
                    .first()["v"]
                )
                total = int(conn.execute(text(f"SELECT COUNT(*) AS v FROM {ut}")).mappings().first()["v"])
                inactive = max(0, total - active)
        out["kpis"]["activeUsers"] = active
        out["kpis"]["inactiveUsers"] = inactive

        # Top traders leaderboard (by profit)
        leaderboard: list[dict[str, Any]] = []
        if trades_table:
            tcols = prof.columns_by_table.get(trades_table, [])
            user_col = pick_first(tcols, ["user_id", "login", "account", "client_id"])
            time_col = pick_first(tcols, ["close_time", "time", "timestamp", "open_time"])
            profit_col = pick_first(tcols, ["profit", "pl", "pnl"])
            commission_col = pick_first(tcols, ["commission"])
            swap_col = pick_first(tcols, ["swap"])

            if user_col and time_col and profit_col:
                tt = safe_sql_identifier(trades_table)
                uc = safe_sql_identifier(user_col)
                tc = safe_sql_identifier(time_col)
                pl = safe_sql_identifier(profit_col)
                pl_expr = pl
                if swap_col:
                    pl_expr = f"({pl_expr} + {safe_sql_identifier(swap_col)})"
                if commission_col:
                    pl_expr = f"({pl_expr} - {safe_sql_identifier(commission_col)})"

                rows = conn.execute(
                    text(
                        f"""
                        SELECT {uc} AS userKey, COUNT(*) AS trades, COALESCE(SUM({pl_expr}),0) AS pnl
                        FROM {tt}
                        WHERE {tc} >= :start AND {tc} < :end
                        GROUP BY {uc}
                        ORDER BY pnl DESC
                        LIMIT 20
                        """
                    ),
                    {"start": s, "end": e},
                ).mappings().all()
                leaderboard = [
                    {"userKey": str(r["userKey"]), "trades": int(r["trades"]), "pnl": float(r["pnl"])} for r in rows
                ]
        out["tables"]["topTraders"] = leaderboard

        # Retention proxy: users who traded in previous period and also in current
        retention = None
        if trades_table:
            tcols = prof.columns_by_table.get(trades_table, [])
            user_col = pick_first(tcols, ["user_id", "login", "account", "client_id"])
            time_col = pick_first(tcols, ["close_time", "time", "timestamp", "open_time"])
            if user_col and time_col:
                uc = safe_sql_identifier(user_col)
                tc = safe_sql_identifier(time_col)
                tt = safe_sql_identifier(trades_table)
                period = e - s
                prev_s = s - period
                prev_e = s
                rows = conn.execute(
                    text(
                        f"""
                        WITH prev AS (
                          SELECT DISTINCT {uc} AS u FROM {tt}
                          WHERE {tc} >= :ps AND {tc} < :pe
                        ),
                        cur AS (
                          SELECT DISTINCT {uc} AS u FROM {tt}
                          WHERE {tc} >= :cs AND {tc} < :ce
                        )
                        SELECT
                          (SELECT COUNT(*) FROM prev) AS prev_users,
                          (SELECT COUNT(*) FROM cur) AS cur_users,
                          (SELECT COUNT(*) FROM prev p JOIN cur c ON c.u = p.u) AS retained
                        """
                    ),
                    {"ps": prev_s, "pe": prev_e, "cs": s, "ce": e},
                ).mappings().first()
                prev_users = int(rows["prev_users"] or 0)
                retained = int(rows["retained"] or 0)
                retention = (retained / prev_users) if prev_users > 0 else None
        out["kpis"]["retentionRate"] = retention

    return out

