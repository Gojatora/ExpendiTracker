def test_create_expense_success(client, auth_headers, test_category):
    response = client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
            "note": "Weekly shopping",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["expense_name"] == "Groceries"
    assert data["amount"] == "250.50"


def test_create_expense_no_auth(client, test_category):
    response = client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
    )
    assert response.status_code == 401  # missing credentials rejected by HTTPBearer


def test_create_expense_invalid_category(client, auth_headers):
    response = client.post(
        "/expenses",
        json={
            "category_id": 9999,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_update_expense_success(client, auth_headers, test_category):
    create_response = client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
        headers=auth_headers,
    )
    expense_id = create_response.json()["expense_id"]

    update_response = client.put(
        f"/expenses/{expense_id}",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries (updated)",
            "amount": "300.00",
            "expense_date": "2026-08-01",
            "note": "Updated",
        },
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["expense_name"] == "Groceries (updated)"


def test_update_expense_not_found(client, auth_headers, test_category):
    response = client.put(
        "/expenses/9999",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
        headers=auth_headers,
    )
    assert response.status_code == 404


def test_update_expense_wrong_owner(client, auth_headers, second_user_auth_headers, test_category):
    create_response = client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
        headers=auth_headers,
    )
    expense_id = create_response.json()["expense_id"]

    update_response = client.put(
        f"/expenses/{expense_id}",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Hacked",
            "amount": "1.00",
            "expense_date": "2026-08-01",
        },
        headers=second_user_auth_headers,
    )
    assert update_response.status_code == 403


def test_delete_expense_success(client, auth_headers, test_category):
    create_response = client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
        headers=auth_headers,
    )
    expense_id = create_response.json()["expense_id"]

    delete_response = client.delete(f"/expenses/{expense_id}", headers=auth_headers)
    assert delete_response.status_code == 204


def test_delete_expense_wrong_owner(client, auth_headers, second_user_auth_headers, test_category):
    create_response = client.post(
        "/expenses",
        json={
            "category_id": test_category.category_id,
            "expense_name": "Groceries",
            "amount": "250.50",
            "expense_date": "2026-08-01",
        },
        headers=auth_headers,
    )
    expense_id = create_response.json()["expense_id"]

    delete_response = client.delete(f"/expenses/{expense_id}", headers=second_user_auth_headers)
    assert delete_response.status_code == 403


def test_delete_expense_not_found(client, auth_headers):
    response = client.delete("/expenses/9999", headers=auth_headers)
    assert response.status_code == 404