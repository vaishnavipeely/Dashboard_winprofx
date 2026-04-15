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
    return now - timedelta(days=30), now


def _session_for_hour(h: int) -> str:
    # Simplified UTC session buckets (approx)
    if 0 <= h < 8:
        return "Asia"
    if 8 <= h < 16:
        return "London"
    return "New York"


def time_analytics(engine: Engine, start: str | None, end: str | None) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    s = _dt(start)
    e = _dt(end)
    if s is None or e is None:
        s, e = _default_range()

    out: dict[str, Any] = {"charts": {}, "meta": {"roles": prof.roles}}
    if not trades_table:
        return out

    cols = prof.columns_by_table.get(trades_table, [])
    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    if not time_col:
        return out

    tt = safe_sql_identifier(trades_table)
    tc = safe_sql_identifier(time_col)
    params = {"start": s, "end": e}

    with engine.connect() as conn:
        # Trades by hour (UTC)
        rows = conn.execute(
            text(
                f"""
                SELECT HOUR({tc}) AS h, COUNT(*) AS v
                FROM {tt}
                WHERE {tc} >= :start AND {tc} < :end
                GROUP BY HOUR({tc})
                ORDER BY h
                """
            ),
            params,
        ).mappings().all()
        out["charts"]["tradesByHour"] = [{"hour": int(r["h"]), "value": int(r["v"])} for r in rows]

        # Trades by day of week
        rows = conn.execute(
            text(
                f"""
                SELECT DAYOFWEEK({tc}) AS dow, COUNT(*) AS v
                FROM {tt}
                WHERE {tc} >= :start AND {tc} < :end
                GROUP BY DAYOFWEEK({tc})
                ORDER BY dow
                """
            ),
            params,
        ).mappings().all()
        out["charts"]["tradesByDayOfWeek"] = [{"dow": int(r["dow"]), "value": int(r["v"])} for r in rows]

        # Peak trading hours
        out["charts"]["peakHours"] = sorted(out["charts"]["tradesByHour"], key=lambda x: x["value"], reverse=True)[:5]

        # Session analysis derived from hour buckets
        session_counts = {"Asia": 0, "London": 0, "New York": 0}
        for r in out["charts"]["tradesByHour"]:
            session_counts[_session_for_hour(int(r["hour"]))] += int(r["value"])
        out["charts"]["marketSessions"] = [{"name": k, "value": int(v)} for k, v in session_counts.items()]

    return out

