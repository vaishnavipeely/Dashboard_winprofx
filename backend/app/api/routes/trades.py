from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.db.engine import get_engine
from app.services.trades_analytics import trades_analytics

router = APIRouter()


@router.get("")
def get_trades_analytics(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    user: str | None = Query(default=None),
    instrument: str | None = Query(default=None),
    _user: dict = Depends(get_current_user),
):
    engine = get_engine()
    return trades_analytics(engine, start=start, end=end, user=user, instrument=instrument)

