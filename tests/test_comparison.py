from datetime import date


def test_comparison_no_auth(client):
    response = client.get("/comparison")
    assert response.status_code == 401


def test_comparison_national_average_no_spending(client, auth_headers, test_benchmark):
    response = client.get("/comparison", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["region_name"] is None
    assert data["benchmark_year"] == 2023

    category = next(
        c for c in data["categories"] if c["category_id"] == test_benchmark.category_id
    )
    assert category["user_spent"] is None
    assert category["benchmark_avg"] == "1000.00"
    assert category["status"] is None


def test_comparison_shows_spending_below_benchmark(
    client, auth_headers, test_category, test_benchmark
):
    today = date.today().isoformat()
    client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Small purchase",
            "amount": "100.00",
            "expense_date": today,
        },
        headers=auth_headers,
    )

    response = client.get("/comparison", headers=auth_headers)
    data = response.json()
    category = next(
        c for c in data["categories"] if c["category_id"] == test_category.category_id
    )
    assert category["user_spent"] == "100.00"
    assert category["status"] == "below"


def test_comparison_shows_spending_above_benchmark(
    client, auth_headers, test_category, test_benchmark
):
    today = date.today().isoformat()
    client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Big purchase",
            "amount": "5000.00",
            "expense_date": today,
        },
        headers=auth_headers,
    )

    response = client.get("/comparison", headers=auth_headers)
    data = response.json()
    category = next(
        c for c in data["categories"] if c["category_id"] == test_category.category_id
    )
    assert category["user_spent"] == "5000.00"
    assert category["status"] == "above"


def test_comparison_ignores_expenses_from_other_months(
    client, auth_headers, test_category, test_benchmark
):
    client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Old expense",
            "amount": "9999.00",
            "expense_date": "2020-01-15",  # far in the past, different month
        },
        headers=auth_headers,
    )

    response = client.get("/comparison", headers=auth_headers)
    data = response.json()
    category = next(
        c for c in data["categories"] if c["category_id"] == test_category.category_id
    )
    assert category["user_spent"] is None


def test_comparison_explicit_region_override(
    client, auth_headers, test_benchmark, test_region
):
    response = client.get(
        f"/comparison?region={test_region.region_name}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["region_name"] == test_region.region_name


def test_comparison_invalid_region(client, auth_headers):
    response = client.get("/comparison?region=NotARealRegion", headers=auth_headers)
    assert response.status_code == 400


def test_comparison_handles_expense_with_no_benchmark(
    client, auth_headers, db_session
):
    from src.models.models import Category

    orphan_category = Category(category_name="No Benchmark Category")
    db_session.add(orphan_category)
    db_session.commit()
    db_session.refresh(orphan_category)

    today = date.today().isoformat()
    client.post(
        "/expenses",
        json={
            "category_id": orphan_category.category_id,
            "expense_name": "Unbenchmarked spend",
            "amount": "75.00",
            "expense_date": today,
        },
        headers=auth_headers,
    )

    response = client.get("/comparison", headers=auth_headers)
    data = response.json()
    category = next(
        c for c in data["categories"] if c["category_id"] == orphan_category.category_id
    )
    assert category["user_spent"] == "75.00"
    assert category["benchmark_avg"] is None
    assert category["status"] is None