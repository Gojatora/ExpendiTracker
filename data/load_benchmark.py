"""
Loader script for ticket #3: Load initial regional benchmark dataset.

Reads a cleaned CSV (data/raw/regional_benchmarks_2024.csv) containing BLS
Consumer Expenditure Survey data in long format, and loads it into the
database - seeding the regions and categories lookup tables first, then
inserting the benchmark rows that reference them.

Run with:
    python -m data.load_benchmarks
"""

import csv
import os
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from src.models.models import Base, Region, Category, RegionalBenchmark

load_dotenv()

CSV_PATH = "data/regional-benchmarks-2023.csv"


def get_session():
    engine = create_engine(os.getenv("DATABASE_URL"))
    Base.metadata.create_all(engine)  # creates tables if they don't exist yet
    Session = sessionmaker(bind=engine)
    return Session()


def get_or_create_region(session, name: str) -> Region:
    """Look up a Region by name, or create it if it doesn't exist yet.
    Prevents duplicate region rows if the loader is run more than once.
    """
    region = session.query(Region).filter_by(region_name=name).first()
    if region is None:
        region = Region(region_name=name)
        session.add(region)
        session.flush()  # assigns region.region_id without committing yet
    return region


def get_or_create_category(session, name: str) -> Category:
    category = session.query(Category).filter_by(category_name=name).first()
    if category is None:
        category = Category(category_name=name)
        session.add(category)
        session.flush()
    return category


def load_benchmarks(csv_path: str = CSV_PATH):
    session = get_session()
    rows_loaded = 0
    rows_skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            region = get_or_create_region(session, row["region_name"].strip())
            category = get_or_create_category(session, row["category_name"].strip())
            year = int(row["year"])

            # Convert annual figure to monthly, matching the RegionalBenchmark
            # schema's avg_monthly_spend column.
            avg_monthly_spend = Decimal(row["avg_monthly_spend"])

            # Skip if this exact region+category+year combo already exists,
            # respecting the UniqueConstraint defined on RegionalBenchmark.
            existing = (
                session.query(RegionalBenchmark)
                .filter_by(
                    region_id=region.region_id,
                    category_id=category.category_id,
                    year=year,
                )
                .first()
            )
            if existing:
                rows_skipped += 1
                continue

            benchmark = RegionalBenchmark(
                region_id=region.region_id,
                category_id=category.category_id,
                avg_monthly_spend=avg_monthly_spend,
                year=year,
            )
            session.add(benchmark)
            rows_loaded += 1

    session.commit()
    session.close()
    print(f"Done. {rows_loaded} benchmark rows loaded, {rows_skipped} skipped (already existed).")


if __name__ == "__main__":
    load_benchmarks()