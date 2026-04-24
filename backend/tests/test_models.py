import pytest
from datetime import datetime, timedelta
from app.models.deal import Deal
from app.models.prospect import Prospect
from app.models.contact import Contact

def test_deal_creation():
    """Test crear deal"""
    future_date = datetime.utcnow() + timedelta(days=7)
    deal = Deal(
        prospectId="prospect_123",
        serviceType="CONSULTORIA_PROYECTO",
        line="Consultoría",
        problem="Necesita optimización",
        benefit="Reducir costos",
        nextAction="Agendar reunión",
        nextActionDate=future_date
    )
    assert deal.prospectId == "prospect_123"
    assert deal.stage == "PROSPECTO_IDENTIFICADO"
    assert deal.probability == 0.0

def test_deal_future_date_validation():
    """Test validar que nextActionDate sea en el futuro"""
    past_date = datetime.utcnow() - timedelta(days=1)
    with pytest.raises(ValueError):
        Deal(
            prospectId="prospect_123",
            serviceType="CONSULTORIA_PROYECTO",
            line="Consultoría",
            problem="Necesita optimización",
            benefit="Reducir costos",
            nextAction="Agendar reunión",
            nextActionDate=past_date
        )

def test_prospect_creation():
    """Test crear prospect"""
    prospect = Prospect(name="Empresa ABC")
    assert prospect.name == "Empresa ABC"

def test_contact_creation():
    """Test crear contact"""
    contact = Contact(
        prospectId="prospect_123",
        name="Juan Pérez",
        role="Gerente"
    )
    assert contact.name == "Juan Pérez"
    assert contact.prospectId == "prospect_123"
