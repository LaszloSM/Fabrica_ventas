from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Goal(BaseModel):
    """Modelo de Meta"""
    id: Optional[str] = Field(None, alias="_id")
    userId: Optional[str] = None
    region: Optional[str] = None
    serviceType: str = Field(...)
    quarter: int = Field(...)
    year: int = Field(...)
    targetValue: Optional[float] = None
    targetUnits: Optional[int] = None
    currentValue: float = Field(default=0)
    currentUnits: int = Field(default=0)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
