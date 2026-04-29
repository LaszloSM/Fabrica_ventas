from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_db
from app.api.v1.router import api_router
from app.services.scheduler_service import SchedulerService
from app.services.ai_service import AIService
from app.services.email_service import EmailService
import logging
import traceback

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

# Global exception handler — returns full traceback so we can diagnose 500s quickly
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    logger.error(f"[500] {request.method} {request.url.path}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": str(exc), "traceback": tb.splitlines()},
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

# Health check — also tests DB connectivity
@app.get("/health")
async def health():
    db_status = "unknown"
    db_error = None
    try:
        _db = await get_db()
        if _db is not None:
            await _db.command("ping")
            db_status = "ok"
        else:
            db_status = "not_initialized"
    except Exception as e:
        db_status = "error"
        db_error = str(e)[:200]
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "app": settings.APP_NAME,
        "db": db_status,
        **({"db_error": db_error} if db_error else {}),
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "CoimpactoB CRM API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }
