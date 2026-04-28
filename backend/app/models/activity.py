from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Activity(BaseModel):
    """Modelo de Actividad"""
    id: Optional[str] = Field(None, alias="_id")
    dealId: Optional[str] = None
    prospectId: Optional[str] = None
    contactId: Optional[str] = None
    type: str = Field(...)
    templateUsed: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    doneAt: datetime = Field(default_factory=datetime.utcnow)
    createdById: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
