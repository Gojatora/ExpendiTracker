from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    """What the client sends to register."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    """What the API sends back. Deliberately excludes password_hash."""
    user_id: int
    email: EmailStr
    monthly_income: Optional[Decimal] = None
    monthly_budget: Optional[Decimal] = None
    region_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    """What the client sends to log in."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """What the API sends back after successful login."""
    access_token: str
    token_type: str = "bearer"

class UpdateRegionRequest(BaseModel):
    region_id: Optional[int] = None