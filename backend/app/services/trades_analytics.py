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


def trades_analytics(
    engine: Engine,
    start: str | None,
    end: str | None,
    user: str | None = None,
    instrument: str | None = None,
) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    s = _dt(start)
    e = _dt(end)
    if s is None or e is None:
        s, e = _default_range()

    out: dict[str, Any] = {"kpis": {}, "charts": {}, "meta": {"roles": prof.roles}}
    if not trades_table:
        return out

    cols = prof.columns_by_table.get(trades_table, [])
    tt = safe_sql_identifier(trades_table)

    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
    symbol_col = pick_first(cols, ["symbol", "instrument"])
    volume_col = pick_first(cols, ["volume", "lots"])
    profit_col = pick_first(cols, ["profit", "pl", "pnl"])
    side_col = pick_first(cols, ["side", "type", "action", "cmd"])

    if not time_col:
        return out

    tc = safe_sql_identifier(time_col)

    where = [f"{tc} >= :start", f"{tc} < :end"]
    params: dict[str, Any] = {"start": s, "end": e}

    if user and user_col:
        where.append(f"{safe_sql_identifier(user_col)} = :user")
        params["user"] = user
    if instrument and symbol_col:
        where.append(f"{safe_sql_identifier(symbol_col)} = :instrument")
        params["instrument"] = instrument

    where_sql = " WHERE " + " AND ".join(where)

    with engine.connect() as conn:
        out["kpis"]["totalTrades"] = int(conn.execute(text(f"SELECT COUNT(*) AS v FROM {tt}{where_sql}"), params).mappings().first()["v"])

        if side_col:
            sc = safe_sql_identifier(side_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT {sc} AS side, COUNT(*) AS v
                    FROM {tt}{where_sql}
                    GROUP BY {sc}
                    """
                ),
                params,
            ).mappings().all()
            out["charts"]["buySell"] = [{"name": str(r["side"]), "value": int(r["v"])} for r in rows]
        else:
            out["charts"]["buySell"] = []

        if profit_col:
            pc = safe_sql_identifier(profit_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT
                      SUM(CASE WHEN {pc} > 0 THEN 1 ELSE 0 END) AS wins,
                      SUM(CASE WHEN {pc} < 0 THEN 1 ELSE 0 END) AS losses,
                      SUM(CASE WHEN {pc} = 0 THEN 1 ELSE 0 END) AS breakeven
                    FROM {tt}{where_sql}
                    """
                ),
                params,
            ).mappings().first()
            wins = int(rows["wins"] or 0)
            losses = int(rows["losses"] or 0)
            total = max(1, wins + losses + int(rows["breakeven"] or 0))
            out["kpis"]["winRate"] = wins / total
            out["kpis"]["lossRate"] = losses / total
        else:
            out["kpis"]["winRate"] = None
            out["kpis"]["lossRate"] = None

        if volume_col:
            vc = safe_sql_identifier(volume_col)
            out["kpis"]["avgTradeSize"] = float(
                conn.execute(text(f"SELECT COALESCE(AVG({vc}),0) AS v FROM {tt}{where_sql}"), params).mappings().first()["v"]
            )
        else:
            out["kpis"]["avgTradeSize"] = None

        if user_col:
            uc = safe_sql_identifier(user_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT COUNT(DISTINCT {uc}) AS traders,
                           COALESCE(AVG(trade_count),0) AS avg_trades_per_user
                    FROM (
                      SELECT {uc}, COUNT(*) AS trade_count
                      FROM {tt}{where_sql}
                      GROUP BY {uc}
                    ) x
                    """
                ),
                params,
            ).mappings().first()
            out["kpis"]["tradeFrequencyPerUser"] = float(rows["avg_trades_per_user"] or 0)
            out["kpis"]["uniqueTraders"] = int(rows["traders"] or 0)
        else:
            out["kpis"]["tradeFrequencyPerUser"] = None
            out["kpis"]["uniqueTraders"] = None

        # Open vs closed trades proxy: if close_time exists, open if null; else N/A
        close_time_col = pick_first(cols, ["close_time"])
        if close_time_col:
            ctc = safe_sql_identifier(close_time_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT
                      SUM(CASE WHEN {ctc} IS NULL THEN 1 ELSE 0 END) AS open_trades,
                      SUM(CASE WHEN {ctc} IS NOT NULL THEN 1 ELSE 0 END) AS closed_trades
                    FROM {tt}{where_sql}
                    """
                ),
                params,
            ).mappings().first()
            out["kpis"]["openTrades"] = int(rows["open_trades"] or 0)
            out["kpis"]["closedTrades"] = int(rows["closed_trades"] or 0)
        else:
            out["kpis"]["openTrades"] = None
            out["kpis"]["closedTrades"] = None

        # Trades over time (daily)
        rows = conn.execute(
            text(
                f"""
                SELECT DATE({tc}) AS d, COUNT(*) AS v
                FROM {tt}{where_sql}
                GROUP BY DATE({tc})
                ORDER BY d
                """
            ),
            params,
        ).mappings().all()
        out["charts"]["tradesOverTime"] = [{"date": str(r["d"]), "value": int(r["v"])} for r in rows]

        # Most traded instruments
        if symbol_col:
            sc = safe_sql_identifier(symbol_col)
            rows = conn.execute(
                text(
                    f"""
                    SELECT {sc} AS instrument, COUNT(*) AS v
                    FROM {tt}{where_sql}
                    GROUP BY {sc}
                    ORDER BY v DESC
                    LIMIT 15
                    """
                ),
                params,
            ).mappings().all()
            out["charts"]["topInstrumentsByTrades"] = [{"name": str(r["instrument"]), "value": int(r["v"])} for r in rows]
        else:
            out["charts"]["topInstrumentsByTrades"] = []

    return out

