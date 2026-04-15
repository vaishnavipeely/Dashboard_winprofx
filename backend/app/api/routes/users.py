from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.db.engine import get_engine
from app.services.users_analytics import users_analytics

router = APIRouter()


@router.get("")
def get_users_analytics(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    _user: dict = Depends(get_current_user),
):
    engine = get_engine()
    return users_analytics(engine, start=start, end=end)

