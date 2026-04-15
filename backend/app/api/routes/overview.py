from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.db.engine import get_engine
from app.services.analytics import overview, schema_summary

router = APIRouter()


@router.get("")
def get_overview(
    start: str | None = Query(default=None, description="ISO datetime or YYYY-MM-DD"),
    end: str | None = Query(default=None, description="ISO datetime or YYYY-MM-DD"),
    _user: dict = Depends(get_current_user),
):
    engine = get_engine()
    return overview(engine, start=start, end=end)


@router.get("/schema")
def get_schema(_user: dict = Depends(get_current_user)):
    engine = get_engine()
    return schema_summary(engine)

