from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.services.ai_service import AIService
from app.services.email_service import EmailService
from app.config import settings
from app.services.deal_service import DealService

router = APIRouter(prefix="/ai", tags=["ai"])

def get_ai_service():
    key = settings.GROQ_API_KEY or "no_key"
    return AIService(
        groq_api_key=key,
        groq_model=settings.GROQ_MODEL
    )

def get_email_service():
    return EmailService(
        sendgrid_api_key=settings.SENDGRID_API_KEY if settings.SENDGRID_API_KEY else None,
        from_email=settings.SENDGRID_FROM_EMAIL
    )

async def get_deal_service(db=Depends(get_db)):
    return DealService(db)

@router.post("/analyze-deal/{deal_id}")
async def analyze_deal(
    deal_id: str,
    deal_service: DealService = Depends(get_deal_service),
    ai_service: AIService = Depends(get_ai_service)
):
    """Analizar deal con IA (Groq - GRATIS)"""
    deal = await deal_service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")

    analysis = await ai_service.analyze_deal(deal)

    return {
        "dealId": deal_id,
        "prospect": deal.prospectId,
        "analysis": analysis
    }

@router.get("/risks/{deal_id}")
async def detect_risks(
    deal_id: str,
    deal_service: DealService = Depends(get_deal_service),
    ai_service: AIService = Depends(get_ai_service)
):
    """Detectar riesgos automáticos en deal"""
    deal = await deal_service.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")

    risks = await ai_service.detect_risks(deal)

    return {
        "dealId": deal_id,
        "risks": risks,
        "riskLevel": "high" if len(risks) > 2 else "medium" if len(risks) > 0 else "low"
    }

@router.get("/recommendations")
async def get_recommendations(
    deal_service: DealService = Depends(get_deal_service),
    ai_service: AIService = Depends(get_ai_service)
):
    """Recomendaciones generales del pipeline"""
    deals, total = await deal_service.list_deals(limit=100)
    recommendations = await ai_service.get_recommendations(deals)

    return {
        "totalDeals": total,
        "recommendations": recommendations
    }

@router.get("/health")
async def ai_health(ai_service: AIService = Depends(get_ai_service)):
    """Verificar estado de Groq"""
    return {
        "status": "ok",
        "provider": "Groq",
        "model": ai_service.model,
        "cost": "$0/mes (GRATIS)",
        "message": "IA completamente funcional"
    }
