from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_db
from app.api.v1.router import api_router
from app.services.scheduler_service import SchedulerService
from app.services.ai_service import AIService
from app.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Iniciando aplicación...")
    await connect_to_mongo()

    # Iniciar scheduler (solo si Groq está configurado)
    scheduler = None
    if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk_TU"):
        db = await get_db()
        ai_service = AIService(
            groq_api_key=settings.GROQ_API_KEY,
            groq_model=settings.GROQ_MODEL
        )
        email_service = EmailService(
            sendgrid_api_key=settings.SENDGRID_API_KEY if settings.SENDGRID_API_KEY else None
        )
        scheduler = SchedulerService(db, ai_service, email_service)
        scheduler.start()
        logger.info("✅ Scheduler iniciado con 4 jobs")
    else:
        logger.info("ℹ️ Scheduler deshabilitado (configura GROQ_API_KEY para activarlo)")

    yield

    # Shutdown
    logger.info("🛑 Cerrando aplicación...")
    if scheduler:
        scheduler.shutdown()
    await close_mongo_connection()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="CRM Backend - Fábrica de Ventas CoimpactoB",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(api_router)

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "CoimpactoB CRM API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }
