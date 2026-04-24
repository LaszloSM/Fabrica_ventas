from pydantic import BaseModel, Field
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

    problem: Optional[str] = Field(None, max_length=500)
    benefit: Optional[str] = Field(None, max_length=500)
    nextAction: Optional[str] = Field(None, max_length=500)
    nextActionDate: Optional[datetime] = None
    assignedTo: Optional[str] = None

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
