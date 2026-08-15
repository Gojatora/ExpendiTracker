from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SetMonthlyBudgetRequest(BaseModel):
    amount: Decimal


class SetCategoryBudgetRequest(BaseModel):
    amount: Decimal


class CategoryBudgetOut(BaseModel):
    category_id: int
    category_name: str
    amount_spent: Decimal
    category_budget: Optional[Decimal] = None
    over_budget: bool

    model_config = ConfigDict(from_attributes=True)


class BudgetSummaryResponse(BaseModel):
    total_spent: Decimal
    monthly_budget: Optional[Decimal] = None
    budget_left: Optional[Decimal] = None
    over_budget_categories: list[str]
    categories: list[CategoryBudgetOut]