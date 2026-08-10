from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.models.models import Expense, RegionalBenchmark, Region, Category


class RegionNotFoundError(Exception):
    """Raised when an explicitly requested region doesn't exist."""
    pass


class ComparisonService:
    def __init__(self, db: Session):
        self.db = db

    def _get_latest_benchmark_year(self) -> int | None:
        """Finds the most recent year present in regional_benchmarks,
        rather than assuming the current calendar year - FIES isn't
        published annually, so this must be discovered, not assumed.
        """
        result = self.db.query(func.max(RegionalBenchmark.year)).scalar()
        return result

    def _resolve_region_id(self, user_region_id: int | None, requested_region_name: str | None) -> int | None:
        """Decides which region to compare against:
        1. An explicitly requested region name, if provided and valid.
        2. Otherwise, the user's own saved region, if they have one.
        3. Otherwise, None - caller falls back to a national average.
        """
        if requested_region_name is not None:
            region = self.db.query(Region).filter(
                Region.region_name == requested_region_name
            ).first()
            if region is None:
                raise RegionNotFoundError(f"Region not found: {requested_region_name}")
            return region.region_id

        return user_region_id

    def get_comparison(
        self,
        user_id: int,
        user_region_id: int | None,
        requested_region_name: str | None = None,
    ) -> dict:
        region_id = self._resolve_region_id(user_region_id, requested_region_name)
        benchmark_year = self._get_latest_benchmark_year()

        today = date.today()
        month_start = today.replace(day=1)

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
        
        spend_by_category = self._get_spend_by_category(user_id, month_start, today)

        if region_id is not None:
            benchmark_rows = (
                self.db.query(RegionalBenchmark)
                .filter(
                    RegionalBenchmark.year == benchmark_year,
                    RegionalBenchmark.region_id == region_id,
                )
                .all()
            )
            benchmark_by_category = {
                row.category_id: row.avg_monthly_spend for row in benchmark_rows
            }
            region_name = self.db.query(Region).filter(
                Region.region_id == region_id
            ).first().region_name
        else:
            benchmark_rows = (
                self.db.query(
                    RegionalBenchmark.category_id,
                    func.avg(RegionalBenchmark.avg_monthly_spend).label("avg_monthly_spend"),
                )
                .filter(RegionalBenchmark.year == benchmark_year)
                .group_by(RegionalBenchmark.category_id)
                .all()
            )
            benchmark_by_category = {
                row.category_id: round(row.avg_monthly_spend, 2) for row in benchmark_rows
            }
            region_name = None  # national average - no single region

        categories = self._build_comparison(spend_by_category, benchmark_by_category)

        return {
            "benchmark_year": benchmark_year,
            "region_name": region_name,
            "categories": categories,
        }

    def _build_comparison(
        self,
        spend_by_category: dict[int, Decimal],
        benchmark_by_category: dict[int, Decimal],
    ) -> list[dict]:
        """Combines spend and benchmark data into one comparison per
        category. Handles missing data on either side gracefully -
        a category with spending but no benchmark, or a benchmark but
        no spending, still produces a valid (partial) result instead
        of crashing or silently dropping the category.
        """
        all_category_ids = set(spend_by_category.keys()) | set(benchmark_by_category.keys())

        categories = {
            c.category_id: c.category_name
            for c in self.db.query(Category).filter(
                Category.category_id.in_(all_category_ids)
            ).all()
        }

        results = []
        for category_id in all_category_ids:
            spent = spend_by_category.get(category_id)
            benchmark = benchmark_by_category.get(category_id)

            status = None
            if spent is not None and benchmark is not None:
                status = "above" if spent > benchmark else (
                    "below" if spent < benchmark else "equal"
                )

            results.append({
                "category_id": category_id,
                "category_name": categories.get(category_id, "Unknown"),
                "user_spent": spent,
                "benchmark_avg": benchmark,
                "status": status,
            })

        return sorted(results, key=lambda r: r["category_name"])

    def get_month_over_month(self, user_id: int) -> dict:
        today = date.today()
        current_month_start = today.replace(day=1)

        # Compute the first day of the previous month, handling the
        # January -> December year rollover.
        if current_month_start.month == 1:
            prev_month_start = current_month_start.replace(year=current_month_start.year - 1, month=12)
        else:
            prev_month_start = current_month_start.replace(month=current_month_start.month - 1)
        prev_month_end = current_month_start - timedelta(days=1)

        current_spend = self._get_spend_by_category(user_id, current_month_start, today)
        previous_spend = self._get_spend_by_category(user_id, prev_month_start, prev_month_end)

        all_category_ids = set(current_spend.keys()) | set(previous_spend.keys())
        categories = {
            c.category_id: c.category_name
            for c in self.db.query(Category).filter(
                Category.category_id.in_(all_category_ids)
            ).all()
        }

        results = []
        for category_id in all_category_ids:
            current = current_spend.get(category_id, Decimal('0'))
            previous = previous_spend.get(category_id, Decimal('0'))

            if previous > 0:
                percent_change = round(((current - previous) / previous) * 100, 2)
            else:
                percent_change = None  # no meaningful percentage from a zero base

            results.append({
                "category_id": category_id,
                "category_name": categories.get(category_id, "Unknown"),
                "current_month_spend": current,
                "previous_month_spend": previous,
                "percent_change": percent_change,
            })

        return {
            "current_month": current_month_start.strftime("%Y-%m"),
            "previous_month": prev_month_start.strftime("%Y-%m"),
            "categories": sorted(results, key=lambda r: r["category_name"]),
        }

    def _get_spend_by_category(self, user_id: int, start: date, end: date) -> dict:
        rows = (
            self.db.query(
                Expense.category_id,
                func.sum(Expense.amount).label("total_spent"),
            )
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= start,
                Expense.expense_date <= end,
            )
            .group_by(Expense.category_id)
            .all()
        )
        return {row.category_id: row.total_spent for row in rows}