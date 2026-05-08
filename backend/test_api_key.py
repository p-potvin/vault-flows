import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import hashlib

from backend.main import app
from backend.db import Base, get_db, APIKey
from backend.api_key_middleware import generate_api_key

# Setup in-memory SQLite database for testing
# Using an in-memory database shared across threads requires a specific connection setup
from sqlalchemy.pool import StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency to use the test database
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

import os

@pytest.fixture(autouse=True)
def setup_db():
    from backend.db import Base as AppBase, User, APIKey, WorkflowConfig, Dataset

    # We must explicitly create tables on the test engine
    AppBase.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db

    yield

    AppBase.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


def test_api_key_missing_header():
    """Test that a request without the API key header is rejected with 401."""
    response = client.get("/workflows")
    assert response.status_code == 401
    assert response.json() == {"detail": "API Key header missing"}

def test_api_key_invalid():
    """Test that a request with an invalid API key is rejected with 403."""
    headers = {"x-api-key": "invalid_key"}
    response = client.get("/workflows", headers=headers)
    assert response.status_code == 403
    assert response.json() == {"detail": "Could not validate API key"}

def test_api_key_valid():
    """Test that a request with a valid API key is accepted."""
    # Generate a raw key
    raw_api_key = generate_api_key()
    hashed_key = hashlib.sha256(raw_api_key.encode()).hexdigest()

    # Insert the hashed key into the test database
    db = TestingSessionLocal()
    new_key = APIKey(key_hash=hashed_key)
    db.add(new_key)
    db.commit()
    db.close()

    # Make request with the raw key
    headers = {"x-api-key": raw_api_key}
    response = client.get("/workflows", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"workflows": []}

def test_generate_api_key():
    """Test that generate_api_key generates a valid random string."""
    key1 = generate_api_key()
    key2 = generate_api_key()
    assert isinstance(key1, str)
    assert len(key1) >= 43 # 32 bytes urlsafe base64 is ~43 chars
    assert key1 != key2 # Ensure randomness
