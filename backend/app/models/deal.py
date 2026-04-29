from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class Deal(BaseModel):
    """Modelo de Oportunidad (Deal)"""
    id: Optional[str] = Field(None, alias="_id")
    prospectId: Optional[str] = Field(default=None)
    contactId: Optional[str] = None
    assignedTo: Optional[str] = None
    serviceType: Optional[str] = Field(default=None)
    line: Optional[str] = Field(default=None)
    businessUnit: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    stage: str = Field(default="PROSPECTO_IDENTIFICADO")
    value: Optional[float] = None
    ponderatedValue: Optional[float] = Field(default=0.0)
    probability: float = Field(default=0.0)
    problem: Optional[str] = Field(None, max_length=500)
    benefit: Optional[str] = Field(None, max_length=500)
    nextAction: Optional[str] = Field(None, max_length=500)
    nextActionDate: Optional[datetime] = None
    notes: Optional[str] = None
    quarter: Optional[int] = None
    expectedCloseDate: Optional[datetime] = None
    wonAt: Optional[datetime] = None
    lostReason: Optional[str] = None
    createdAt: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updatedAt: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
