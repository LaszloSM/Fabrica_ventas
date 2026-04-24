from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

class DealCreate(BaseModel):
    prospectId: str
    contactId: Optional[str] = None
    serviceType: str
    line: str
    segment: Optional[str] = None
    region: Optional[str] = None
    value: Optional[float] = None
    quarter: Optional[int] = None

    # CAMPOS CRÍTICOS (OBLIGATORIOS)
    problem: str = Field(..., min_length=10, max_length=500)
    benefit: str = Field(..., min_length=10, max_length=500)
    nextAction: str = Field(..., min_length=5, max_length=500)
    nextActionDate: datetime
    assignedTo: Optional[str] = None

    @field_validator('nextActionDate')
    @classmethod
    def next_action_date_must_be_future(cls, v):
        if v <= datetime.utcnow():
            raise ValueError('nextActionDate debe ser en el futuro')
        return v

class DealUpdate(BaseModel):
    stage: Optional[str] = None
    value: Optional[float] = None
    problem: Optional[str] = None
    benefit: Optional[str] = None
    nextAction: Optional[str] = None
    nextActionDate: Optional[datetime] = None
    notes: Optional[str] = None
    assignedTo: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    prospectId: str
    contactId: Optional[str]
    serviceType: str
    line: str
    stage: str
    value: Optional[float]
    ponderatedValue: float
    probability: float
    problem: str
    benefit: str
    nextAction: str
    nextActionDate: datetime
    assignedTo: Optional[str]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
