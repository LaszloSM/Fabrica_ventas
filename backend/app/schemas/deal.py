from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class DealCreate(BaseModel):
    prospectId: str
    contactId: Optional[str] = None
    serviceType: str
    line: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    value: Optional[float] = None
    quarter: Optional[int] = None
    stage: Optional[str] = "PROSPECTO_IDENTIFICADO"
    notes: Optional[str] = None
    problem: Optional[str] = Field(default=None, max_length=500)
    benefit: Optional[str] = Field(default=None, max_length=500)
    nextAction: Optional[str] = Field(default=None, max_length=500)
    nextActionDate: Optional[datetime] = None
    assignedTo: Optional[str] = None
    proyectos: Optional[str] = None
    sourceTab: Optional[str] = None

class DealUpdate(BaseModel):
    stage: Optional[str] = None
    value: Optional[float] = None
    valueSetAt: Optional[datetime] = None
    problem: Optional[str] = None
    benefit: Optional[str] = None
    nextAction: Optional[str] = None
    nextActionDate: Optional[datetime] = None
    notes: Optional[str] = None
    assignedTo: Optional[str] = None
    proyectos: Optional[str] = None

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
    nextActionDate: Optional[datetime]
    assignedTo: Optional[str]
    valueSetAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
