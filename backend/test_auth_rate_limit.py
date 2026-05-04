from fastapi.testclient import TestClient
from backend.main import app
import pytest

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown():
    # Reset the rate limiting dictionary before each test
    from backend.auth_routes import FAILED_LOGIN_ATTEMPTS
    FAILED_LOGIN_ATTEMPTS.clear()

    # Use client to create user using standard flow which will setup db automatically
    client.post("/auth/register", json={"username": "testuser", "password": "correctpassword"})

    yield

def test_login_rate_limiting():
    # 1. 5 failed login attempts
    for _ in range(5):
        response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    # 2. 6th attempt should be blocked
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 429
    assert "Too many failed login attempts" in response.json()["detail"]

    # 3. 7th attempt with correct password should still be blocked
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "correctpassword"}
    )
    assert response.status_code == 429

def test_successful_login_resets_rate_limit():
    # 1. 4 failed attempts
    for _ in range(4):
        response = client.post(
            "/auth/login",
            json={"username": "testuser", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    # 2. 1 successful attempt
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "correctpassword"}
    )
    assert response.status_code == 200

    # 3. Can fail again without hitting the limit (it was reset)
    response = client.post(
        "/auth/login",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401
