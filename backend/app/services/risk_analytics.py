from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd
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


def _max_drawdown(series: pd.Series) -> float | None:
    if series.empty:
        return None
    cumulative = series.cumsum()
    running_max = cumulative.cummax()
    drawdown = cumulative - running_max
    return float(drawdown.min())  # negative number


def risk_analytics(engine: Engine, start: str | None, end: str | None, user: str | None = None) -> dict[str, Any]:
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    risk_table = prof.roles.get("risk")

    s = _dt(start)
    e = _dt(end)
    if s is None or e is None:
        s, e = _default_range()

    out: dict[str, Any] = {"kpis": {}, "charts": {}, "alerts": [], "meta": {"roles": prof.roles}}

    with engine.connect() as conn:
        # Max drawdown (overall) from trade PnL series (daily)
        if trades_table:
            tt = safe_sql_identifier(trades_table)
            cols = prof.columns_by_table.get(trades_table, [])
            time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
            user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
            profit_col = pick_first(cols, ["profit", "pl", "pnl"])
            if time_col and profit_col:
                tc = safe_sql_identifier(time_col)
                pc = safe_sql_identifier(profit_col)
                where = [f"{tc} >= :start", f"{tc} < :end"]
                params: dict[str, Any] = {"start": s, "end": e}
                if user and user_col:
                    where.append(f"{safe_sql_identifier(user_col)} = :user")
                    params["user"] = user
                where_sql = " WHERE " + " AND ".join(where)

                rows = conn.execute(
                    text(
                        f"""
                        SELECT DATE({tc}) AS d, COALESCE(SUM({pc}),0) AS pnl
                        FROM {tt}{where_sql}
                        GROUP BY DATE({tc})
                        ORDER BY d
                        """
                    ),
                    params,
                ).mappings().all()
                df = pd.DataFrame(rows)
                if not df.empty:
                    df["pnl"] = df["pnl"].astype(float)
                    mdd = _max_drawdown(df["pnl"])
                    out["kpis"]["maximumDrawdown"] = mdd
                    out["charts"]["equityCurve"] = [
                        {"date": str(d), "equity": float(eq)} for d, eq in zip(df["d"], df["pnl"].cumsum())
                    ]
                else:
                    out["kpis"]["maximumDrawdown"] = None
                    out["charts"]["equityCurve"] = []
            else:
                out["kpis"]["maximumDrawdown"] = None
                out["charts"]["equityCurve"] = []
        else:
            out["kpis"]["maximumDrawdown"] = None
            out["charts"]["equityCurve"] = []

        # Leverage / margin usage snapshots (best-effort)
        leverage_avg = None
        margin_level_min = None
        margin_call_users: list[dict[str, Any]] = []
        if risk_table:
            rt = safe_sql_identifier(risk_table)
            cols = prof.columns_by_table.get(risk_table, [])
            time_col = pick_first(cols, ["time", "timestamp", "created_at", "date"])
            user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
            leverage_col = pick_first(cols, ["leverage"])
            margin_level_col = pick_first(cols, ["margin_level"])
            margin_col = pick_first(cols, ["margin"])
            equity_col = pick_first(cols, ["equity"])
            balance_col = pick_first(cols, ["balance"])

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

            if leverage_col:
                lc = safe_sql_identifier(leverage_col)
                leverage_avg = float(
                    conn.execute(text(f"SELECT COALESCE(AVG({lc}),0) AS v FROM {rt}{where_sql}"), params).mappings().first()["v"]
                )

            # Margin call alerts: margin_level below threshold (e.g. < 100)
            if margin_level_col and user_col:
                mlc = safe_sql_identifier(margin_level_col)
                uc = safe_sql_identifier(user_col)
                rows = conn.execute(
                    text(
                        f"""
                        SELECT {uc} AS userKey, MIN({mlc}) AS min_margin_level
                        FROM {rt}{where_sql}
                        GROUP BY {uc}
                        HAVING MIN({mlc}) < 100
                        ORDER BY min_margin_level ASC
                        LIMIT 50
                        """
                    ),
                    params,
                ).mappings().all()
                margin_call_users = [
                    {"userKey": str(r["userKey"]), "minMarginLevel": float(r["min_margin_level"])} for r in rows
                ]
                margin_level_min = float(min((u["minMarginLevel"] for u in margin_call_users), default=0.0)) if margin_call_users else None

            # Risk exposure proxy: margin / equity if available
            if margin_col and equity_col:
                mc = safe_sql_identifier(margin_col)
                ec = safe_sql_identifier(equity_col)
                rows = conn.execute(
                    text(f"SELECT COALESCE(AVG(CASE WHEN {ec} = 0 THEN 0 ELSE {mc}/{ec} END),0) AS v FROM {rt}{where_sql}"),
                    params,
                ).mappings().first()
                out["kpis"]["avgMarginToEquity"] = float(rows["v"] or 0)
            elif balance_col and equity_col:
                bc = safe_sql_identifier(balance_col)
                ec = safe_sql_identifier(equity_col)
                rows = conn.execute(
                    text(f"SELECT COALESCE(AVG({bc} - {ec}),0) AS v FROM {rt}{where_sql}"),
                    params,
                ).mappings().first()
                out["kpis"]["avgFloatingLoss"] = float(rows["v"] or 0)

        out["kpis"]["avgLeverage"] = leverage_avg
        out["kpis"]["minMarginLevel"] = margin_level_min

        if margin_call_users:
            out["alerts"].append({"type": "margin_call_risk", "message": "Users with low margin level detected", "users": margin_call_users})

        # Losing streak detection (by user) from trades
        losing_streaks: list[dict[str, Any]] = []
        if trades_table:
            cols = prof.columns_by_table.get(trades_table, [])
            user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
            time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
            profit_col = pick_first(cols, ["profit", "pl", "pnl"])
            if user_col and time_col and profit_col and not user:
                tt = safe_sql_identifier(trades_table)
                uc = safe_sql_identifier(user_col)
                tc = safe_sql_identifier(time_col)
                pc = safe_sql_identifier(profit_col)
                # Pull a limited window to keep it fast
                rows = conn.execute(
                    text(
                        f"""
                        SELECT {uc} AS userKey, {tc} AS t, {pc} AS pnl
                        FROM {tt}
                        WHERE {tc} >= :start AND {tc} < :end
                        ORDER BY {uc}, {tc}
                        """
                    ),
                    {"start": s, "end": e},
                ).mappings().all()
                df = pd.DataFrame(rows)
                if not df.empty:
                    df["pnl"] = df["pnl"].astype(float)
                    df["is_loss"] = df["pnl"] < 0
                    # Compute streaks per user
                    for user_key, g in df.groupby("userKey"):
                        streak = 0
                        max_streak = 0
                        for is_loss in g["is_loss"].tolist():
                            if is_loss:
                                streak += 1
                                max_streak = max(max_streak, streak)
                            else:
                                streak = 0
                        if max_streak >= 5:
                            losing_streaks.append({"userKey": str(user_key), "maxLosingStreak": int(max_streak)})
                    losing_streaks.sort(key=lambda x: x["maxLosingStreak"], reverse=True)
                    losing_streaks = losing_streaks[:50]
        if losing_streaks:
            out["alerts"].append({"type": "losing_streak", "message": "Users with losing streaks detected", "users": losing_streaks})

    return out

