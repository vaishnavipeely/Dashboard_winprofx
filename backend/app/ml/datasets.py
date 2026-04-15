from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.schema.inspector import profile_schema_from_engine, safe_sql_identifier
from app.utils.columns import pick_first


def _default_range(days: int = 180) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    return now - timedelta(days=days), now


def load_trade_outcome_dataset(engine: Engine, start: datetime | None = None, end: datetime | None = None) -> pd.DataFrame:
    """
    Binary label: profitable trade (pnl > 0).
    Features: volume, hour-of-day, day-of-week, symbol (one-hot later), side/type (optional).
    """
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    if not trades_table:
        return pd.DataFrame()

    cols = prof.columns_by_table.get(trades_table, [])
    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    profit_col = pick_first(cols, ["profit", "pl", "pnl"])
    volume_col = pick_first(cols, ["volume", "lots"])
    symbol_col = pick_first(cols, ["symbol", "instrument"])
    side_col = pick_first(cols, ["side", "type", "action", "cmd"])

    if not (time_col and profit_col and volume_col and symbol_col):
        return pd.DataFrame()

    if start is None or end is None:
        start, end = _default_range(365)

    tt = safe_sql_identifier(trades_table)
    tc = safe_sql_identifier(time_col)
    pc = safe_sql_identifier(profit_col)
    vc = safe_sql_identifier(volume_col)
    sc = safe_sql_identifier(symbol_col)
    sel_side = f", {safe_sql_identifier(side_col)} AS side" if side_col else ""

    q = text(
        f"""
        SELECT {tc} AS t, {pc} AS pnl, {vc} AS volume, {sc} AS symbol{sel_side}
        FROM {tt}
        WHERE {tc} >= :start AND {tc} < :end
        """
    )

    with engine.connect() as conn:
        rows = conn.execute(q, {"start": start, "end": end}).mappings().all()
    df = pd.DataFrame(rows)
    if df.empty:
        return df

    df["t"] = pd.to_datetime(df["t"], utc=True, errors="coerce")
    df = df.dropna(subset=["t"])
    df["pnl"] = pd.to_numeric(df["pnl"], errors="coerce").fillna(0.0)
    df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0.0)
    df["label"] = (df["pnl"] > 0).astype(int)
    df["hour"] = df["t"].dt.hour
    df["dow"] = df["t"].dt.dayofweek
    df["symbol"] = df["symbol"].astype(str)
    if "side" in df.columns:
        df["side"] = df["side"].astype(str)
    return df[["volume", "hour", "dow", "symbol"] + (["side"] if "side" in df.columns else []) + ["label"]]


def load_user_churn_dataset(engine: Engine, as_of: datetime | None = None) -> pd.DataFrame:
    """
    Churn label: no trades in last 30 days.
    Features: lifetime trades, pnl sum, last_trade_days_ago, avg_volume, active_days.
    """
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    if not trades_table:
        return pd.DataFrame()

    cols = prof.columns_by_table.get(trades_table, [])
    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
    profit_col = pick_first(cols, ["profit", "pl", "pnl"])
    volume_col = pick_first(cols, ["volume", "lots"])
    if not (time_col and user_col):
        return pd.DataFrame()

    if as_of is None:
        as_of = datetime.now(timezone.utc)

    tt = safe_sql_identifier(trades_table)
    tc = safe_sql_identifier(time_col)
    uc = safe_sql_identifier(user_col)
    pc = safe_sql_identifier(profit_col) if profit_col else None
    vc = safe_sql_identifier(volume_col) if volume_col else None

    pnl_expr = f"COALESCE(SUM({pc}),0)" if pc else "0"
    avg_vol_expr = f"COALESCE(AVG({vc}),0)" if vc else "0"

    q = text(
        f"""
        SELECT
          {uc} AS userKey,
          COUNT(*) AS trades,
          {pnl_expr} AS pnl,
          {avg_vol_expr} AS avg_volume,
          MIN(DATE({tc})) AS first_day,
          MAX(DATE({tc})) AS last_day
        FROM {tt}
        WHERE {tc} < :as_of
        GROUP BY {uc}
        """
    )

    with engine.connect() as conn:
        rows = conn.execute(q, {"as_of": as_of}).mappings().all()
    df = pd.DataFrame(rows)
    if df.empty:
        return df

    df["trades"] = pd.to_numeric(df["trades"], errors="coerce").fillna(0).astype(int)
    df["pnl"] = pd.to_numeric(df["pnl"], errors="coerce").fillna(0.0)
    df["avg_volume"] = pd.to_numeric(df["avg_volume"], errors="coerce").fillna(0.0)
    df["first_day"] = pd.to_datetime(df["first_day"], utc=True, errors="coerce")
    df["last_day"] = pd.to_datetime(df["last_day"], utc=True, errors="coerce")
    df = df.dropna(subset=["last_day"])

    df["last_trade_days_ago"] = (pd.Timestamp(as_of) - df["last_day"]).dt.days.clip(lower=0)
    df["active_days"] = (df["last_day"] - df["first_day"]).dt.days.fillna(0).clip(lower=0)
    df["label"] = (df["last_trade_days_ago"] > 30).astype(int)
    return df[["trades", "pnl", "avg_volume", "last_trade_days_ago", "active_days", "label"]]


def load_revenue_timeseries(engine: Engine, start: datetime | None = None, end: datetime | None = None) -> pd.DataFrame:
    """
    Revenue proxy: sum(commission) per day from trades if commission exists.
    """
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    if not trades_table:
        return pd.DataFrame()

    cols = prof.columns_by_table.get(trades_table, [])
    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    commission_col = pick_first(cols, ["commission"])
    if not (time_col and commission_col):
        return pd.DataFrame()

    if start is None or end is None:
        start, end = _default_range(365)

    tt = safe_sql_identifier(trades_table)
    tc = safe_sql_identifier(time_col)
    cc = safe_sql_identifier(commission_col)

    q = text(
        f"""
        SELECT DATE({tc}) AS d, COALESCE(SUM({cc}),0) AS revenue
        FROM {tt}
        WHERE {tc} >= :start AND {tc} < :end
        GROUP BY DATE({tc})
        ORDER BY d
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(q, {"start": start, "end": end}).mappings().all()
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["d"] = pd.to_datetime(df["d"], utc=True, errors="coerce")
    df["revenue"] = pd.to_numeric(df["revenue"], errors="coerce").fillna(0.0)
    df = df.dropna(subset=["d"])
    return df[["d", "revenue"]]


def load_fraud_dataset(engine: Engine, start: datetime | None = None, end: datetime | None = None) -> pd.DataFrame:
    """
    Unsupervised: detect abnormal users using aggregated behavior.
    Features: trades, pnl, avg_volume, pnl_std, symbols_count.
    """
    prof = profile_schema_from_engine(engine)
    trades_table = prof.roles.get("trades")
    if not trades_table:
        return pd.DataFrame()

    cols = prof.columns_by_table.get(trades_table, [])
    time_col = pick_first(cols, ["close_time", "time", "timestamp", "open_time"])
    user_col = pick_first(cols, ["user_id", "login", "account", "client_id"])
    profit_col = pick_first(cols, ["profit", "pl", "pnl"])
    volume_col = pick_first(cols, ["volume", "lots"])
    symbol_col = pick_first(cols, ["symbol", "instrument"])
    if not (time_col and user_col and profit_col and volume_col and symbol_col):
        return pd.DataFrame()

    if start is None or end is None:
        start, end = _default_range(180)

    tt = safe_sql_identifier(trades_table)
    tc = safe_sql_identifier(time_col)
    uc = safe_sql_identifier(user_col)
    pc = safe_sql_identifier(profit_col)
    vc = safe_sql_identifier(volume_col)
    sc = safe_sql_identifier(symbol_col)

    q = text(
        f"""
        SELECT
          {uc} AS userKey,
          COUNT(*) AS trades,
          COALESCE(SUM({pc}),0) AS pnl,
          COALESCE(AVG({vc}),0) AS avg_volume,
          COALESCE(STDDEV_POP({pc}),0) AS pnl_std,
          COUNT(DISTINCT {sc}) AS symbols_count
        FROM {tt}
        WHERE {tc} >= :start AND {tc} < :end
        GROUP BY {uc}
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(q, {"start": start, "end": end}).mappings().all()
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    for c in ["trades", "pnl", "avg_volume", "pnl_std", "symbols_count"]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)
    df["userKey"] = df["userKey"].astype(str)
    return df

