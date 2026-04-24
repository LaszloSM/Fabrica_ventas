from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProspectCreate(BaseModel):
    name: str = Field(..., min_length=1)
    industry: Optional[str] = None
    size: Optional[str] = None
    region: Optional[str] = None
    segment: Optional[str] = None
    website: Optional[str] = None
    linkedinUrl: Optional[str] = None
    assignedTo: Optional[str] = None

class ProspectUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    region: Optional[str] = None
    segment: Optional[str] = None
    website: Optional[str] = None
    linkedinUrl: Optional[str] = None
    assignedTo: Optional[str] = None

class ProspectResponse(BaseModel):
    id: str
    name: str
    industry: Optional[str]
    size: Optional[str]
    region: Optional[str]
    segment: Optional[str]
    website: Optional[str]
    linkedinUrl: Optional[str]
    assignedTo: Optional[str]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
