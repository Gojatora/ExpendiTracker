from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExpenseCreate(BaseModel):
    """What the client sends to log an expense."""
    category_id: int
    expense_name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, decimal_places=2)
    expense_date: date
    note: Optional[str] = Field(default=None, max_length=500)


class ExpenseUpdate(BaseModel):
    """What the client sends to fully replace an existing expense (PUT semantics)."""
    category_id: int
    expense_name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, decimal_places=2)
    expense_date: date
    note: Optional[str] = Field(default=None, max_length=500)


class ExpenseOut(BaseModel):
    """What the API sends back."""
    expense_id: int
    user_id: int
    category_id: int
    expense_name: str
    amount: Decimal
    expense_date: date
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)