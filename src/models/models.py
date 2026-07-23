"""
SQLAlchemy models for ExpendiTracker.

Each class below maps to one database table. This is the ORM (Object-Relational
Mapper) layer - it lets us work with Python objects/classes instead of writing
raw SQL, while SQLAlchemy translates our class definitions into actual
PostgreSQL tables under the hood.

Primary keys are named
explicitly (e.g. user_id, expense_id) rather than a generic "id", to match
the ER diagram and make foreign key references self-explanatory when read
in isolation (e.g. Expense.user_id clearly refers to User.user_id).
"""

from sqlalchemy import (
    Column, Integer, String, Numeric, Date, DateTime,
    ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import relationship, declarative_base

# Base class that all our models inherit from. SQLAlchemy uses this to keep
# track of every table we define, so it knows what to create in the database.
Base = declarative_base()


class Region(Base):
    """Lookup table for regions (e.g. states/metro areas).
    Normalized out into its own table so region names are stored once,
    not duplicated as raw strings on every user/benchmark row.
    """
    __tablename__ = "regions"

    region_id = Column(Integer, primary_key=True)
    region_name = Column(String(100), unique=True, nullable=False)  # e.g. "California"

    # relationship() is NOT a database column - it's a Python-only convenience
    # that lets us write `some_region.users` to get all users in that region,
    # without writing a manual query every time.
    users = relationship("User", back_populates="region")
    benchmarks = relationship("RegionalBenchmark", back_populates="region")


class Category(Base):
    """Lookup table for expense categories (e.g. Food, Housing, Transportation).
    Same normalization reasoning as Region.
    """
    __tablename__ = "categories"

    category_id = Column(Integer, primary_key=True)
    category_name = Column(String(100), unique=True, nullable=False)

    expenses = relationship("Expense", back_populates="category")
    benchmarks = relationship("RegionalBenchmark", back_populates="category")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)  # never store plaintext passwords
    monthly_income = Column(Numeric(10, 2), nullable=True)

    # ForeignKey creates an actual database-enforced link: Postgres will reject
    # any region_id that doesn't exist in the regions table.
    # nullable=True because setting a location is a Should-Have feature -
    # a new user may not have picked one yet.
    region_id = Column(Integer, ForeignKey("regions.region_id"), nullable=True)

    # server_default=func.now() lets Postgres itself stamp the creation time,
    # rather than relying on the application to set it.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    region = relationship("Region", back_populates="users")

    # cascade="all, delete-orphan": if a User row is deleted, automatically
    # delete all their Expense rows too, instead of leaving orphaned rows
    # pointing at a user that no longer exists.
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")


class Expense(Base):
    __tablename__ = "expenses"

    expense_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=False)
    expense_name = Column(String(255), nullable=False)

    # Numeric(10, 2), NOT Float - floats introduce rounding errors that are
    # unacceptable for money. Numeric is exact fixed-point decimal storage.
    amount = Column(Numeric(10, 2), nullable=False)

    expense_date = Column(Date, nullable=False)
    note = Column(String(500), nullable=True)  # optional, per the user story
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")


class RegionalBenchmark(Base):
    """Reference data pulled from public sources (e.g. BLS Consumer
    Expenditure Survey) - not owned by any user. ComparisonService queries
    this table alongside a user's Expense rows to compute the dashboard
    comparison.
    """
    __tablename__ = "regional_benchmarks"

    # A table-level constraint spanning multiple columns together: prevents
    # duplicate benchmark rows for the same region + category + year combo.
    __table_args__ = (
        UniqueConstraint("region_id", "category_id", "year", name="uq_region_category_year"),
    )

    benchmark_id = Column(Integer, primary_key=True)
    region_id = Column(Integer, ForeignKey("regions.region_id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.category_id"), nullable=False)
    avg_monthly_spend = Column(Numeric(10, 2), nullable=False)
    year = Column(Integer, nullable=False)

    region = relationship("Region", back_populates="benchmarks")
    category = relationship("Category", back_populates="benchmarks")