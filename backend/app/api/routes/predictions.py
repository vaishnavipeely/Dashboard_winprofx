from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import require_role
from app.db.engine import get_engine
from app.services.predictions_service import registry

router = APIRouter()


@router.post("/train")
def train_models(_user: dict = Depends(require_role("admin"))):
    engine = get_engine()
    return registry.train_all(engine)


@router.get("")
def get_predictions(_user: dict = Depends(require_role("admin"))):
    engine = get_engine()
    return registry.predict(engine)

