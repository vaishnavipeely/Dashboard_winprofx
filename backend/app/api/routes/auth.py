from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


_ADMIN_HASH = hash_password(settings.admin_password)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    if req.email.lower() != settings.admin_email.lower():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, _ADMIN_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(subject=req.email, role=settings.admin_role)
    return TokenResponse(access_token=token, role=settings.admin_role)


@router.get("/me")
def me():
    # Lightweight info to validate service is up; front-end uses token decode check.
    return {"issuer": settings.jwt_issuer, "audience": settings.jwt_audience}

