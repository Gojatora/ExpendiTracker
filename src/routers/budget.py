from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies import get_current_user
from src.models.models import User
from src.schemas.budget import (
    SetMonthlyBudgetRequest,
    SetCategoryBudgetRequest,
    BudgetSummaryResponse,
)
from src.schemas.user import UserOut
from src.services.budget_service import BudgetService, CategoryNotFoundError

router = APIRouter(prefix="/budget", tags=["budget"])


@router.put("/monthly", response_model=UserOut)
def set_monthly_budget(
    request: SetMonthlyBudgetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BudgetService(db)
    return service.set_monthly_budget(current_user.user_id, request.amount)


@router.put("/categories/{category_id}")
def set_category_budget(
    category_id: int,
    request: SetCategoryBudgetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BudgetService(db)
    try:
        return service.set_category_budget(current_user.user_id, category_id, request.amount)
    except CategoryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified category does not exist.",
        )


@router.get("/summary", response_model=BudgetSummaryResponse)
def get_budget_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = BudgetService(db)
    return service.get_budget_summary(current_user.user_id)