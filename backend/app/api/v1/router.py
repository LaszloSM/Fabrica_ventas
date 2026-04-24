from fastapi import APIRouter
from app.api.v1.endpoints import deals, prospects, ai, templates, activities, sequences, triggers, metrics, template_sequences, import_data, import_comprehensive, users, reports, team

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(deals.router)
api_router.include_router(prospects.router)
api_router.include_router(ai.router)
api_router.include_router(templates.router)
api_router.include_router(activities.router)
api_router.include_router(sequences.router)
api_router.include_router(triggers.router)
api_router.include_router(metrics.router)
api_router.include_router(template_sequences.router)
api_router.include_router(import_data.router)
api_router.include_router(import_comprehensive.router)
api_router.include_router(users.router)
api_router.include_router(reports.router)
api_router.include_router(team.router)

__all__ = ["api_router"]
