from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

security = HTTPBearer(auto_error=False)


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"subject": payload.get("sub"), "role": payload.get("role", "user"), "payload": payload}


def require_role(required: str):
    def _dep(user: dict = Depends(get_current_user)) -> dict:
        role = user.get("role", "user")
        if role != required and role != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return _dep

