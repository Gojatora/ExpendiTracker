from sqlalchemy.orm import Session

from src.models.models import Category, Expense
from src.schemas.expense import ExpenseCreate, ExpenseUpdate

from datetime import date


class CategoryNotFoundError(Exception):
    """Raised when the given category_id doesn't exist."""
    pass


class ExpenseNotFoundError(Exception):
    """Raised when the given expense_id doesn't exist."""
    pass


class NotExpenseOwnerError(Exception):
    """Raised when a user tries to edit/delete an expense that isn't theirs."""
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

    def _get_owned_expense(self, user_id: int, expense_id: int) -> Expense:
        """Shared lookup for update/delete - fetches an expense and verifies
        ownership. Raises ExpenseNotFoundError or NotExpenseOwnerError.
        """
        expense = self.db.query(Expense).filter(
            Expense.expense_id == expense_id
        ).first()
        if expense is None:
            raise ExpenseNotFoundError(f"Expense not found: {expense_id}")
        if expense.user_id != user_id:
            raise NotExpenseOwnerError(
                f"User {user_id} does not own expense {expense_id}"
            )
        return expense

    def update_expense(
        self, user_id: int, expense_id: int, expense_data: ExpenseUpdate
    ) -> Expense:
        expense = self._get_owned_expense(user_id, expense_id)

        category = self.db.query(Category).filter(
            Category.category_id == expense_data.category_id
        ).first()
        if category is None:
            raise CategoryNotFoundError(
                f"Category not found: {expense_data.category_id}"
            )

        expense.category_id = expense_data.category_id
        expense.expense_name = expense_data.expense_name
        expense.amount = expense_data.amount
        expense.expense_date = expense_data.expense_date
        expense.note = expense_data.note

        self.db.commit()
        self.db.refresh(expense)

        return expense

    def delete_expense(self, user_id: int, expense_id: int) -> None:
        expense = self._get_owned_expense(user_id, expense_id)
        self.db.delete(expense)
        self.db.commit()

    def get_expenses(
        self,
        user_id: int,
        category_id: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[Expense]:
        """Returns the authenticated user's own expenses, optionally
        filtered by category and/or a date range. Never accepts a
        different user's expenses - user_id always comes from the
        verified JWT via the router, never from client-supplied input.
        """
        query = self.db.query(Expense).filter(Expense.user_id == user_id)

        if category_id is not None:
            query = query.filter(Expense.category_id == category_id)
        if start_date is not None:
            query = query.filter(Expense.expense_date >= start_date)
        if end_date is not None:
            query = query.filter(Expense.expense_date <= end_date)

        return query.order_by(
            Expense.expense_date.desc(),
            Expense.created_at.desc(),
        ).all()