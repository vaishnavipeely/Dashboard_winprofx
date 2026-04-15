from __future__ import annotations


def pick_first(existing_cols: list[str], candidates: list[str]) -> str | None:
    lower = {c.lower(): c for c in existing_cols}
    for cand in candidates:
        if cand.lower() in lower:
            return lower[cand.lower()]
    return None


def has_any(existing_cols: list[str], candidates: list[str]) -> bool:
    lower = {c.lower() for c in existing_cols}
    return any(c.lower() in lower for c in candidates)

