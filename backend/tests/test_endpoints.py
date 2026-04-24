import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health check"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert "message" in response.json()

@pytest.mark.asyncio
async def test_list_deals():
    """Test listar deals"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/deals")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

@pytest.mark.asyncio
async def test_create_deal():
    """Test crear deal"""
    future_date = (datetime.utcnow() + timedelta(days=7)).isoformat()

    deal_data = {
        "prospectId": "prospect_test_123",
        "serviceType": "CONSULTORIA_PROYECTO",
        "line": "Consultoría",
        "problem": "Necesita optimizar procesos de minería",
        "benefit": "Reducir costos operativos en 30%",
        "nextAction": "Agendar reunión de diagnóstico",
        "nextActionDate": future_date
    }

    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/v1/deals", json=deal_data)
        assert response.status_code == 201
        data = response.json()
        assert data["prospectId"] == "prospect_test_123"
        assert data["stage"] == "PROSPECTO_IDENTIFICADO"
