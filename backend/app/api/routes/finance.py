from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.db.engine import get_engine
from app.services.finance_analytics import finance_analytics

router = APIRouter()


@router.get("")
def get_finance_analytics(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    user: str | None = Query(default=None),
    _user: dict = Depends(get_current_user),
):
    engine = get_engine()
    return finance_analytics(engine, start=start, end=end, user=user)

