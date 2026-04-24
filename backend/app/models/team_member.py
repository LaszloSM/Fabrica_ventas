from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class TeamMemberBase(BaseModel):
    name: str
    email: Optional[str] = None
    role: str = "SALES_REP"  # SALES_REP, SALES_LEAD, ADMIN
    isActive: bool = True

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None

class TeamMember(TeamMemberBase):
    id: Optional[str] = Field(None, alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
