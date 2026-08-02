from sqlalchemy.orm import Session

from src.models.models import Category, Expense
from src.schemas.expense import ExpenseCreate


class CategoryNotFoundError(Exception):
    """Raised when the given category_id doesn't exist."""
    pass


class ExpenseService:
    def __init__(self, db: Session):
        self.db = db

    def create_expense(self, user_id: int, expense_data: ExpenseCreate) -> Expense:
        category = self.db.query(Category).filter(
            Category.category_id == expense_data.category_id
        ).first()
        if category is None:
            raise CategoryNotFoundError(
                f"Category not found: {expense_data.category_id}"
            )

        new_expense = Expense(
            user_id=user_id,
            category_id=expense_data.category_id,
            expense_name=expense_data.expense_name,
            amount=expense_data.amount,
            expense_date=expense_data.expense_date,
            note=expense_data.note,
        )
        self.db.add(new_expense)
        self.db.commit()
        self.db.refresh(new_expense)

        return new_expense