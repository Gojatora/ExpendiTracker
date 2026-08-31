from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class CategoryComparison(BaseModel):
    category_id: int
    category_name: str
    user_spent: Optional[Decimal] = None
    benchmark_avg: Optional[Decimal] = None
    status: Optional[str] = None  # "above", "below", "equal", or None if data is missing


class ComparisonResponse(BaseModel):
    benchmark_year: Optional[int] = None
    region_name: Optional[str] = None  # None means national average was used
    categories: list[CategoryComparison]

class MonthCategoryComparison(BaseModel):
    category_id: int
    category_name: str
    current_month_spend: Decimal
    previous_month_spend: Decimal
    percent_change: Optional[Decimal] = None


class MonthOverMonthResponse(BaseModel):
    current_month: str
    previous_month: str
    categories: list[MonthCategoryComparison]

class YearlyTrendItem(BaseModel):
    month: str
    total: Decimal