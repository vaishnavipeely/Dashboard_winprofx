from fastapi import APIRouter

from app.api.routes import auth, finance, instruments, overview, predictions, risk, time, trades, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(overview.router, prefix="/overview", tags=["overview"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
api_router.include_router(finance.router, prefix="/finance", tags=["finance"])
api_router.include_router(instruments.router, prefix="/instruments", tags=["instruments"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
api_router.include_router(time.router, prefix="/time", tags=["time"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["predictions"])

