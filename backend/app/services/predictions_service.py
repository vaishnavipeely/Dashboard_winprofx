from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from sqlalchemy.engine import Engine

from app.ml.datasets import (
    load_fraud_dataset,
    load_revenue_timeseries,
    load_trade_outcome_dataset,
    load_user_churn_dataset,
)
from app.ml.pipelines import (
    score_fraud,
    train_fraud_detector,
    train_revenue_forecast,
    train_trade_outcome,
    train_user_churn,
)


@lru_cache(maxsize=1)
def _cache_key() -> int:
    # LRU cache is used for models; key changing forces rebuild.
    return 0


class ModelRegistry:
    def __init__(self) -> None:
        self.trade_model: Any | None = None
        self.trade_metrics: dict[str, Any] | None = None
        self.churn_model: Any | None = None
        self.churn_metrics: dict[str, Any] | None = None
        self.fraud_model: Any | None = None
        self.fraud_metrics: dict[str, Any] | None = None
        self.last_trained_at: str | None = None

    def train_all(self, engine: Engine) -> dict[str, Any]:
        res: dict[str, Any] = {"trained": {}, "warnings": []}

        df_trade = load_trade_outcome_dataset(engine)
        tr = train_trade_outcome(df_trade)
        if tr:
            self.trade_model = tr.model
            self.trade_metrics = tr.metrics | {"rows": tr.n_rows}
            res["trained"]["tradeOutcome"] = self.trade_metrics
        else:
            res["warnings"].append("Trade outcome model: insufficient schema/data (need time, pnl, volume, symbol).")

        df_churn = load_user_churn_dataset(engine)
        cr = train_user_churn(df_churn)
        if cr:
            self.churn_model = cr.model
            self.churn_metrics = cr.metrics | {"rows": cr.n_rows}
            res["trained"]["userChurn"] = self.churn_metrics
        else:
            res["warnings"].append("Churn model: insufficient schema/data (need trades user+time).")

        df_fraud = load_fraud_dataset(engine)
        fr = train_fraud_detector(df_fraud)
        if fr:
            self.fraud_model = fr.model
            self.fraud_metrics = fr.metrics | {"rows": fr.n_rows}
            res["trained"]["fraudDetector"] = self.fraud_metrics
        else:
            res["warnings"].append("Fraud detector: insufficient schema/data (need user,time,pnl,volume,symbol).")

        self.last_trained_at = datetime.now(timezone.utc).isoformat()
        res["lastTrainedAt"] = self.last_trained_at
        return res

    def predict(self, engine: Engine) -> dict[str, Any]:
        out: dict[str, Any] = {"generatedAt": datetime.now(timezone.utc).isoformat(), "results": {}, "warnings": []}

        # 1) Trade outcome prediction sample: returns global probability distribution for recent trades
        if self.trade_model is not None:
            df = load_trade_outcome_dataset(engine)
            if not df.empty:
                X = df.drop(columns=["label"])
                p = self.trade_model.predict_proba(X)[:, 1]
                out["results"]["tradeOutcome"] = {
                    "avgProbProfitable": float(p.mean()),
                    "p50": float(float(sorted(p)[len(p) // 2])),
                    "samples": int(len(p)),
                    "metrics": self.trade_metrics,
                }
            else:
                out["warnings"].append("Trade outcome prediction: no rows found.")
        else:
            out["warnings"].append("Trade outcome model not trained.")

        # 2) User churn: top users by churn probability (requires exposing user keys; we output generic ranking)
        if self.churn_model is not None:
            df = load_user_churn_dataset(engine)
            if not df.empty:
                X = df.drop(columns=["label"])
                prob = self.churn_model.predict_proba(X)[:, 1]
                df2 = df.copy()
                df2["churnProb"] = prob
                df2 = df2.sort_values("churnProb", ascending=False).head(25)
                out["results"]["userChurn"] = {
                    "top": [{"rank": int(i + 1), "churnProb": float(r["churnProb"]), "trades": float(r["trades"])} for i, (_, r) in enumerate(df2.iterrows())],
                    "metrics": self.churn_metrics,
                }
            else:
                out["warnings"].append("Churn prediction: no rows found.")
        else:
            out["warnings"].append("Churn model not trained.")

        # 3) Revenue forecasting
        ts = load_revenue_timeseries(engine)
        rf = train_revenue_forecast(ts, horizon_days=14) if not ts.empty else None
        if rf:
            out["results"]["revenueForecast"] = rf
        else:
            out["warnings"].append("Revenue forecast: insufficient schema/data (need trades commission + time).")

        # 4) Fraud detection
        if self.fraud_model is not None:
            df = load_fraud_dataset(engine)
            if not df.empty:
                out["results"]["fraudDetection"] = {"topAnomalies": score_fraud(self.fraud_model, df), "metrics": self.fraud_metrics}
            else:
                out["warnings"].append("Fraud detection: no rows found.")
        else:
            out["warnings"].append("Fraud model not trained.")

        # 5) Market trend prediction (placeholder): requires price bars/ticks table which may not exist in backups.
        out["results"]["marketTrendPrediction"] = {
            "status": "not_available",
            "reason": "No standardized price time-series table detected. Add a price/bars feed table to enable this model.",
        }

        return out


registry = ModelRegistry()

