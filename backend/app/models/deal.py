from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class Deal(BaseModel):
    """Modelo de Oportunidad (Deal)"""
    id: Optional[str] = Field(None, alias="_id")
    prospectId: str = Field(...)
    contactId: Optional[str] = None
    assignedTo: Optional[str] = None
    serviceType: str = Field(...)
    line: str = Field(...)
    businessUnit: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    stage: str = Field(default="PROSPECTO_IDENTIFICADO")
    value: Optional[float] = None
    ponderatedValue: float = Field(default=0.0)
    probability: float = Field(default=0.0)
    problem: str = Field(..., min_length=10, max_length=500)
    benefit: str = Field(..., min_length=10, max_length=500)
    nextAction: str = Field(..., min_length=5, max_length=500)
    nextActionDate: datetime = Field(...)
    notes: Optional[str] = None
    quarter: Optional[int] = None
    expectedCloseDate: Optional[datetime] = None
    wonAt: Optional[datetime] = None
    lostReason: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('nextActionDate')
    @classmethod
    def next_action_date_must_be_future(cls, v):
        if v <= datetime.utcnow():
            raise ValueError('nextActionDate debe ser en el futuro')
        return v

    class Config:
        populate_by_name = True
