from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Contact(BaseModel):
    """Modelo de Contacto"""
    id: Optional[str] = Field(None, alias="_id")
    prospectId: str = Field(...)
    name: str = Field(..., min_length=1)
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedinUrl: Optional[str] = None
    isPrimary: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
