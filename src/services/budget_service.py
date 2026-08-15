from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.models.models import User, Category, CategoryBudget, Expense


class CategoryNotFoundError(Exception):
    """Raised when the given category_id doesn't exist."""
    pass


class BudgetService:
    def __init__(self, db: Session):
        self.db = db

    def set_monthly_budget(self, user_id: int, amount: Decimal) -> User:
        user = self.db.query(User).filter(User.user_id == user_id).first()
        user.monthly_budget = amount
        self.db.commit()
        self.db.refresh(user)
        return user

    def set_category_budget(self, user_id: int, category_id: int, amount: Decimal) -> CategoryBudget:
        category = self.db.query(Category).filter(Category.category_id == category_id).first()
        if category is None:
            raise CategoryNotFoundError(f"Category not found: {category_id}")

        existing = self.db.query(CategoryBudget).filter(
            CategoryBudget.user_id == user_id,
            CategoryBudget.category_id == category_id,
        ).first()

        if existing:
            existing.amount = amount
            self.db.commit()
            self.db.refresh(existing)
            return existing

        new_budget = CategoryBudget(user_id=user_id, category_id=category_id, amount=amount)
        self.db.add(new_budget)
        self.db.commit()
        self.db.refresh(new_budget)
        return new_budget

    def get_category_budgets(self, user_id: int) -> list[CategoryBudget]:
        return self.db.query(CategoryBudget).filter(CategoryBudget.user_id == user_id).all()

    def get_budget_summary(self, user_id: int) -> dict:
        today = date.today()
        month_start = today.replace(day=1)

        user = self.db.query(User).filter(User.user_id == user_id).first()

        spend_rows = (
            self.db.query(
                Expense.category_id,
                func.sum(Expense.amount).label("total_spent"),
            )
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= month_start,
                Expense.expense_date <= today,
            )
            .group_by(Expense.category_id)
            .all()
        )
        spend_by_category = {row.category_id: row.total_spent for row in spend_rows}
        total_spent = sum(spend_by_category.values(), Decimal('0'))

        budget_left = None
        if user.monthly_budget is not None:
            budget_left = user.monthly_budget - total_spent

        category_budgets = self.get_category_budgets(user_id)
        budget_by_category = {cb.category_id: cb.amount for cb in category_budgets}

        all_category_ids = set(spend_by_category.keys()) | set(budget_by_category.keys())
        categories = {
            c.category_id: c.category_name
            for c in self.db.query(Category).filter(
                Category.category_id.in_(all_category_ids)
            ).all()
        }

        category_results = []
        over_budget_categories = []
        for category_id in all_category_ids:
            spent = spend_by_category.get(category_id, Decimal('0'))
            cat_budget = budget_by_category.get(category_id)
            is_over = cat_budget is not None and spent > cat_budget

            if is_over:
                over_budget_categories.append(categories.get(category_id, "Unknown"))

            category_results.append({
                "category_id": category_id,
                "category_name": categories.get(category_id, "Unknown"),
                "amount_spent": spent,
                "category_budget": cat_budget,
                "over_budget": is_over,
            })

        return {
            "total_spent": total_spent,
            "monthly_budget": user.monthly_budget,
            "budget_left": budget_left,
            "over_budget_categories": sorted(over_budget_categories),
            "categories": sorted(category_results, key=lambda r: r["category_name"]),
        }