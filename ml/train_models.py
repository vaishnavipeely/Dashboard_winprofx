from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine

# Reuse backend code
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.predictions_service import registry  # noqa: E402


def main() -> None:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise SystemExit("DATABASE_URL is not set")
    engine = create_engine(db_url, pool_pre_ping=True)
    res = registry.train_all(engine)
    print(res)


if __name__ == "__main__":
    main()

