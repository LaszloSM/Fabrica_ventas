import pytest
from datetime import datetime, timedelta
from app.models.deal import Deal
from app.services.ai_service import AIService

@pytest.mark.asyncio
async def test_ai_health():
    """Test que AIService se puede instanciar"""
    ai_service = AIService(groq_api_key="test_key")
    assert ai_service.model == "mixtral-8x7b-32768"

@pytest.mark.asyncio
async def test_detect_risks():
    """Test detectar riesgos"""
    ai_service = AIService(groq_api_key="test_key")

    old_date = datetime.utcnow() - timedelta(days=20)
    deal = Deal(
        id="deal_test_123",
        prospectId="prospect_123",
        serviceType="CONSULTORIA_PROYECTO",
        line="Consultoría",
        problem="Test problem description",
        benefit="Test benefit description",
        nextAction="Test action",
        nextActionDate=datetime.utcnow() + timedelta(days=1),
        updatedAt=old_date
    )

    risks = await ai_service.detect_risks(deal)

    assert len(risks) > 0
    assert any("Sin movimiento" in r for r in risks)

@pytest.mark.asyncio
async def test_get_recommendations():
    """Test recomendaciones generales"""
    ai_service = AIService(groq_api_key="test_key")

    future_date = datetime.utcnow() + timedelta(days=7)
    deals = [
        Deal(
            id=f"deal_{i}",
            prospectId=f"prospect_{i}",
            serviceType="CONSULTORIA_PROYECTO",
            line="Consultoría",
            problem="Test problem description",
            benefit="Test benefit description",
            nextAction="Test action",
            nextActionDate=future_date,
            stage="PROSPECTO_IDENTIFICADO" if i < 2 else "GANADO"
        )
        for i in range(5)
    ]

    recommendations = await ai_service.get_recommendations(deals)

    assert len(recommendations) > 0
    assert isinstance(recommendations, list)
