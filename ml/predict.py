from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.predictions_service import registry  # noqa: E402


def main() -> None:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise SystemExit("DATABASE_URL is not set")
    engine = create_engine(db_url, pool_pre_ping=True)
    # Ensure models exist (train if needed)
    if registry.trade_model is None and registry.churn_model is None and registry.fraud_model is None:
        registry.train_all(engine)
    res = registry.predict(engine)
    print(res)


if __name__ == "__main__":
    main()

