import os
import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

load_dotenv()

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")

from src.models.models import Base, Category, Region, RegionalBenchmark
from src.db.session import get_db
from src.main import app

test_engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Creates all tables fresh before each test, drops them after.
    Every test starts from a guaranteed-empty database.
    """
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """A FastAPI TestClient whose get_db dependency is overridden to use
    the test database session instead of the real one.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # db_session fixture handles closing

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    """Registers and logs in a test user, returns headers ready to use
    on any authenticated request.
    """
    client.post(
        "/auth/register",
        json={"email": "expenseuser@example.com", "password": "testpass123"},
    )
    response = client.post(
        "/auth/login",
        json={"email": "expenseuser@example.com", "password": "testpass123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user_auth_headers(client):
    """A second, different logged-in user - for testing ownership checks."""
    client.post(
        "/auth/register",
        json={"email": "otheruser@example.com", "password": "testpass123"},
    )
    response = client.post(
        "/auth/login",
        json={"email": "otheruser@example.com", "password": "testpass123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_category(db_session):
    """Inserts a category directly into the test DB, so expense tests
    have a valid category_id to reference without depending on any
    external seed data.
    """
    category = Category(category_name="Food")
    db_session.add(category)
    db_session.commit()
    db_session.refresh(category)
    return category

@pytest.fixture
def test_region(db_session):
    region = Region(region_name="Test Region")
    db_session.add(region)
    db_session.commit()
    db_session.refresh(region)
    return region


@pytest.fixture
def test_benchmark(db_session, test_category, test_region):
    """A single benchmark row: Test Region + the shared test_category,
    year 2023, so ComparisonService's 'find latest year' logic has
    something concrete to find.
    """
    benchmark = RegionalBenchmark(
        region_id=test_region.region_id,
        category_id=test_category.category_id,
        avg_monthly_spend=1000.00,
        year=2023,
    )
    db_session.add(benchmark)
    db_session.commit()
    db_session.refresh(benchmark)
    return benchmark