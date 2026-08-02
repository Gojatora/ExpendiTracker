from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.session import get_db
from src.dependencies import get_current_user
from src.models.models import User
from src.schemas.expense import ExpenseCreate, ExpenseOut
from src.services.expense_service import ExpenseService, CategoryNotFoundError

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