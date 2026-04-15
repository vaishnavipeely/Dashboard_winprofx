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


def instrument_analytics(engine: Engine, start: str | None, end: str | None) -> dict[str, Any]:
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
    tt = safe_sql_identifier(trades_table)

    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    symbol_col = pick_first(cols, ["symbol", "instrument"])
    volume_col = pick_first(cols, ["volume", "lots"])
    profit_col = pick_first(cols, ["profit", "pl", "pnl"])

    if not (time_col and symbol_col):
        return out

    tc = safe_sql_identifier(time_col)
    sc = safe_sql_identifier(symbol_col)
    where_sql = f" WHERE {tc} >= :start AND {tc} < :end"
    params = {"start": s, "end": e}

    with engine.connect() as conn:
        # Most traded instruments
        rows = conn.execute(
            text(
                f"""
                SELECT {sc} AS instrument, COUNT(*) AS trades
                FROM {tt}{where_sql}
                GROUP BY {sc}
                ORDER BY trades DESC
                LIMIT 20
                """
            ),
            params,
        ).mappings().all()
        out["charts"]["mostTraded"] = [{"name": str(r["instrument"]), "value": int(r["trades"])} for r in rows]

        # Volume per instrument
        if volume_col:
            vc = safe_sql_identifier(volume_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT {sc} AS instrument, COALESCE(SUM({vc}),0) AS volume
                    FROM {tt}{where_sql}
                    GROUP BY {sc}
                    ORDER BY volume DESC
                    LIMIT 20
                    """
                ),
                params,
            ).mappings().all()
            out["charts"]["volumePerInstrument"] = [{"name": str(r["instrument"]), "value": float(r["volume"])} for r in rows]
        else:
            out["charts"]["volumePerInstrument"] = []

        # Profit per instrument
        if profit_col:
            pc = safe_sql_identifier(profit_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT {sc} AS instrument, COALESCE(SUM({pc}),0) AS pnl
                    FROM {tt}{where_sql}
                    GROUP BY {sc}
                    ORDER BY pnl DESC
                    LIMIT 20
                    """
                ),
                params,
            ).mappings().all()
            out["charts"]["profitPerInstrument"] = [{"name": str(r["instrument"]), "value": float(r["pnl"])} for r in rows]
        else:
            out["charts"]["profitPerInstrument"] = []

        # Popular trading pairs (top 15)
        rows = conn.execute(
            text(
                f"""
                SELECT {sc} AS instrument, COUNT(*) AS trades
                FROM {tt}{where_sql}
                GROUP BY {sc}
                ORDER BY trades DESC
                LIMIT 15
                """
            ),
            params,
        ).mappings().all()
        out["charts"]["popularPairs"] = [{"name": str(r["instrument"]), "value": int(r["trades"])} for r in rows]

    return out

