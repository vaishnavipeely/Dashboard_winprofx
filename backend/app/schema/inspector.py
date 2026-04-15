from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from sqlalchemy import MetaData, inspect
from sqlalchemy.engine import Engine

from app.schema.heuristics import classify_table, pick_best_table


@dataclass(frozen=True)
class SchemaProfile:
    dialect: str
    tables: list[str]
    columns_by_table: dict[str, list[str]]
    roles: dict[str, str | None]  # users/trades/finance/risk -> best table or None


def _get_columns(inspector: Any, table: str, schema: str | None) -> list[str]:
    cols = inspector.get_columns(table, schema=schema)
    return [c["name"] for c in cols]


@lru_cache(maxsize=1)
def profile_schema(engine_url: str) -> SchemaProfile:
    # Cache key uses URL string; engine is created elsewhere.
    raise RuntimeError("Call profile_schema_from_engine(engine) instead.")


@lru_cache(maxsize=1)
def profile_schema_from_engine(engine: Engine, schema: str | None = None) -> SchemaProfile:
    insp = inspect(engine)
    dialect = engine.dialect.name

    tables = insp.get_table_names(schema=schema)
    columns_by_table: dict[str, list[str]] = {}
    role_candidates: dict[str, dict[str, Any]] = {}

    for t in tables:
        cols = _get_columns(insp, t, schema)
        columns_by_table[t] = cols
        role_candidates[t] = classify_table(t, set(cols))

    roles = pick_best_table(role_candidates)
    return SchemaProfile(dialect=dialect, tables=tables, columns_by_table=columns_by_table, roles=roles)


def safe_sql_identifier(name: str) -> str:
    # Very conservative: allow alnum + underscore only.
    clean = "".join(ch for ch in name if (ch.isalnum() or ch == "_"))
    if not clean:
        raise ValueError("Invalid identifier")
    return clean

