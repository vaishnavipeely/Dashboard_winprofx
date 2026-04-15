from __future__ import annotations

from dataclasses import dataclass


def _norm(s: str) -> str:
    return s.lower().strip()


USER_COL_HINTS = {"user_id", "userid", "id", "login", "email", "phone", "created_at", "registration", "reg_date"}
TRADE_COL_HINTS = {
    "symbol",
    "instrument",
    "volume",
    "lots",
    "profit",
    "commission",
    "swap",
    "open_time",
    "close_time",
    "time",
    "timestamp",
    "price_open",
    "price_close",
    "type",
    "action",
}
FIN_COL_HINTS = {"amount", "deposit", "withdraw", "withdrawal", "payment", "balance", "equity", "credit", "profit"}
RISK_COL_HINTS = {"margin", "margin_free", "margin_level", "leverage", "equity", "balance", "stop_out", "drawdown"}


@dataclass(frozen=True)
class TableRole:
    name: str
    confidence: float


def classify_table(table_name: str, column_names: set[str]) -> dict[str, TableRole]:
    t = _norm(table_name)
    cols = {_norm(c) for c in column_names}

    scores: dict[str, float] = {
        "users": 0.0,
        "trades": 0.0,
        "finance": 0.0,
        "risk": 0.0,
    }

    # Name-based hints (MT4/MT5 backups often include: users, deals, orders, positions)
    if any(k in t for k in ["user", "client", "account"]):
        scores["users"] += 2.0
    if any(k in t for k in ["deal", "order", "trade", "position"]):
        scores["trades"] += 2.0
    if any(k in t for k in ["deposit", "withdraw", "payment", "transaction", "balance"]):
        scores["finance"] += 2.0
    if any(k in t for k in ["risk", "margin", "equity", "exposure"]):
        scores["risk"] += 2.0

    # Column-based hints
    scores["users"] += len(cols & USER_COL_HINTS) / 3.0
    scores["trades"] += len(cols & TRADE_COL_HINTS) / 3.0
    scores["finance"] += len(cols & FIN_COL_HINTS) / 3.0
    scores["risk"] += len(cols & RISK_COL_HINTS) / 3.0

    out: dict[str, TableRole] = {}
    for role, score in scores.items():
        # Convert to a 0..1-ish confidence (soft-ish scaling)
        conf = max(0.0, min(1.0, score / 4.0))
        out[role] = TableRole(name=role, confidence=conf)
    return out


def pick_best_table(candidates: dict[str, dict[str, TableRole]]) -> dict[str, str | None]:
    """
    candidates: table_name -> role->TableRole
    returns: role -> best_table_name (or None)
    """
    best: dict[str, tuple[str, float]] = {}
    for table, roles in candidates.items():
        for role, tr in roles.items():
            prev = best.get(role)
            if prev is None or tr.confidence > prev[1]:
                best[role] = (table, tr.confidence)
    return {role: (best[role][0] if best[role][1] >= 0.35 else None) for role in ["users", "trades", "finance", "risk"]}

