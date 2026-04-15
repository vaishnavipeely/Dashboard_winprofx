from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from joblib import dump, load
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


@dataclass
class TrainResult:
    model: Any
    metrics: dict[str, Any]
    n_rows: int


def train_trade_outcome(df: pd.DataFrame) -> TrainResult | None:
    if df.empty or "label" not in df.columns:
        return None
    y = df["label"].astype(int)
    X = df.drop(columns=["label"])

    cat_cols = [c for c in ["symbol", "side"] if c in X.columns]
    num_cols = [c for c in X.columns if c not in cat_cols]

    pre = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("scaler", StandardScaler())]), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ]
    )

    clf = LogisticRegression(max_iter=1000)
    pipe = Pipeline([("pre", pre), ("clf", clf)])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None)
    pipe.fit(X_train, y_train)

    metrics: dict[str, Any] = {"rocAuc": None}
    if y_test.nunique() > 1:
        p = pipe.predict_proba(X_test)[:, 1]
        metrics["rocAuc"] = float(roc_auc_score(y_test, p))
    return TrainResult(model=pipe, metrics=metrics, n_rows=int(len(df)))


def train_user_churn(df: pd.DataFrame) -> TrainResult | None:
    if df.empty or "label" not in df.columns:
        return None
    y = df["label"].astype(int)
    X = df.drop(columns=["label"])
    pipe = Pipeline([("scaler", StandardScaler()), ("clf", RandomForestClassifier(n_estimators=200, random_state=42))])
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y if y.nunique() > 1 else None)
    pipe.fit(X_train, y_train)
    metrics: dict[str, Any] = {"accuracy": float(pipe.score(X_test, y_test))}
    return TrainResult(model=pipe, metrics=metrics, n_rows=int(len(df)))


def train_revenue_forecast(ts: pd.DataFrame, horizon_days: int = 14) -> dict[str, Any] | None:
    if ts.empty or not {"d", "revenue"}.issubset(set(ts.columns)):
        return None
    df = ts.copy()
    df = df.sort_values("d")
    df["t"] = (df["d"] - df["d"].min()).dt.days.astype(int)
    X = df[["t"]].values
    y = df["revenue"].values
    model = LinearRegression()
    model.fit(X, y)

    last_t = int(df["t"].max())
    future_t = np.arange(last_t + 1, last_t + 1 + horizon_days)
    yhat = model.predict(future_t.reshape(-1, 1))
    future_dates = [df["d"].max() + pd.Timedelta(days=i) for i in range(1, horizon_days + 1)]
    forecast = [{"date": d.date().isoformat(), "value": float(v)} for d, v in zip(future_dates, yhat)]
    return {"horizonDays": horizon_days, "forecast": forecast, "coef": float(model.coef_[0]), "intercept": float(model.intercept_)}


def train_fraud_detector(df: pd.DataFrame) -> TrainResult | None:
    if df.empty or "userKey" not in df.columns:
        return None
    X = df.drop(columns=["userKey"]).astype(float)
    model = IsolationForest(n_estimators=300, contamination=0.05, random_state=42)
    model.fit(X)
    return TrainResult(model=model, metrics={"method": "IsolationForest"}, n_rows=int(len(df)))


def score_fraud(model: IsolationForest, df: pd.DataFrame, top_n: int = 25) -> list[dict[str, Any]]:
    if df.empty:
        return []
    X = df.drop(columns=["userKey"]).astype(float)
    # Higher score = more normal; use negative for anomaly rank
    scores = model.score_samples(X)
    df2 = df.copy()
    df2["anomalyScore"] = -scores
    df2 = df2.sort_values("anomalyScore", ascending=False).head(top_n)
    return [
        {"userKey": str(r["userKey"]), "anomalyScore": float(r["anomalyScore"]), "trades": float(r["trades"]), "pnl": float(r["pnl"])}
        for _, r in df2.iterrows()
    ]


def save_model(path: str, model: Any) -> None:
    dump(model, path)


def load_model(path: str) -> Any:
    return load(path)

