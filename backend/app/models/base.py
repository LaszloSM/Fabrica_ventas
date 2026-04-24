from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

def now() -> datetime:
    return datetime.utcnow()

class BaseDocument(BaseModel):
    """Base model para documentos MongoDB"""
    id: Optional[str] = Field(None, alias="_id")
    createdAt: datetime = Field(default_factory=now)
    updatedAt: datetime = Field(default_factory=now)

    class Config:
        populate_by_name = True
