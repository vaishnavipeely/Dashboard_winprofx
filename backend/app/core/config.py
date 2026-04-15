from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str | None = None

    jwt_secret: str = "change-me"
    jwt_issuer: str = "winprofx-analytics"
    jwt_audience: str = "winprofx-dashboard"
    access_token_expires_minutes: int = 60

    admin_email: str = "admin@local"
    admin_password: str = "change-me"
    admin_role: str = "admin"

    cors_allow_origins: str = "http://localhost:5173"

    app_env: str = "dev"
    log_level: str = "INFO"


settings = Settings()

