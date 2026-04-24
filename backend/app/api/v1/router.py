from fastapi import APIRouter
from app.api.v1.endpoints import deals, prospects, ai

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(deals.router)
api_router.include_router(prospects.router)
api_router.include_router(ai.router)

__all__ = ["api_router"]
