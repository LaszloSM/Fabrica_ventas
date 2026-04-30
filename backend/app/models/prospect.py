from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Prospect(BaseModel):
    """Modelo de Prospect (Empresa)"""
    id: Optional[str] = Field(None, alias="_id")
    name: Optional[str] = Field(default=None)
    industry: Optional[str] = None
    size: Optional[str] = None
    region: Optional[str] = None
    segment: Optional[str] = None
    website: Optional[str] = None
    linkedinUrl: Optional[str] = None
    assignedTo: Optional[str] = None
    createdAt: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updatedAt: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
