def test_register_success(client):
    response = client.post(
        "/auth/register",
        json={"email": "newuser@example.com", "password": "testpass123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(client):
    client.post(
        "/auth/register",
        json={"email": "dupe@example.com", "password": "testpass123"},
    )
    response = client.post(
        "/auth/register",
        json={"email": "dupe@example.com", "password": "differentpass456"},
    )
    assert response.status_code == 409


def test_register_password_too_short(client):
    response = client.post(
        "/auth/register",
        json={"email": "shortpass@example.com", "password": "abc123"},
    )
    assert response.status_code == 422


def test_register_invalid_email(client):
    response = client.post(
        "/auth/register",
        json={"email": "not-an-email", "password": "testpass123"},
    )
    assert response.status_code == 422


def test_login_success(client):
    client.post(
        "/auth/register",
        json={"email": "logintest@example.com", "password": "testpass123"},
    )
    response = client.post(
        "/auth/login",
        json={"email": "logintest@example.com", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/auth/register",
        json={"email": "wrongpass@example.com", "password": "correctpass123"},
    )
    response = client.post(
        "/auth/login",
        json={"email": "wrongpass@example.com", "password": "wrongpass456"},
    )
    assert response.status_code == 401


def test_login_nonexistent_email(client):
    response = client.post(
        "/auth/login",
        json={"email": "doesnotexist@example.com", "password": "anything123"},
    )
    assert response.status_code == 401