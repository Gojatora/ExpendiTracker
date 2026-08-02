from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies import get_current_user
from src.models.models import User
from src.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from src.services.expense_service import (
    ExpenseService,
    CategoryNotFoundError,
    ExpenseNotFoundError,
    NotExpenseOwnerError,
)
from datetime import date
from typing import Optional


router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExpenseService(db)
    try:
        new_expense = service.create_expense(current_user.user_id, expense_data)
    except CategoryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified category does not exist.",
        )
    return new_expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExpenseService(db)
    try:
        updated_expense = service.update_expense(
            current_user.user_id, expense_id, expense_data
        )
    except ExpenseNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found.",
        )
    except NotExpenseOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this expense.",
        )
    except CategoryNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified category does not exist.",
        )
    return updated_expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExpenseService(db)
    try:
        service.delete_expense(current_user.user_id, expense_id)
    except ExpenseNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found.",
        )
    except NotExpenseOwnerError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this expense.",
        )

@router.get("", response_model=list[ExpenseOut])
def get_expenses(
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ExpenseService(db)
    return service.get_expenses(
        user_id=current_user.user_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
    )