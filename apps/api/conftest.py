"""Pytest configuration and fixtures for DealBase API tests."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool

from dealbase_api.main import app
from dealbase_api.database import get_session
from dealbase_api.models import *  # Import all models
from dealbase_api.routers.deals import DealCreate


@pytest.fixture(scope="function")
def test_db():
    """Create isolated test database for each test."""
    # Create in-memory SQLite database for testing
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
    SQLModel.metadata.create_all(engine)
    
    yield engine
    
    # Clean up after test
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(scope="function")
def test_session(test_db):
    """Create database session for testing."""
    with Session(test_db) as session:
        yield session


@pytest.fixture(scope="function")
def test_client(test_db):
    """Create test client with isolated database."""
    def get_test_session():
        with Session(test_db) as session:
            yield session
    
    # Override the database dependency
    app.dependency_overrides[get_session] = get_test_session
    
    client = TestClient(app)
    
    yield client
    
    # Clean up dependency override
    app.dependency_overrides.clear()


# Test data fixtures
@pytest.fixture
def sample_deal_data():
    """Sample deal data for testing."""
    return {
        "name": "Test Office Building",
        "property_type": "Office",
        "address": "123 Test Street",
        "city": "Test City",
        "state": "TS",
        "zip_code": "12345",
        "description": "A test office building for unit testing"
    }


@pytest.fixture
def sample_deal_create(sample_deal_data):
    """Sample DealCreate object for testing."""
    return DealCreate(**sample_deal_data)


@pytest.fixture
def sample_t12_data():
    """Sample T-12 data for testing."""
    return {
        "month": [1, 2, 3, 4, 5, 6],
        "year": [2023, 2023, 2023, 2023, 2023, 2023],
        "gross_rent": [85000, 87000, 89000, 91000, 88000, 93000],
        "operating_expenses": [25000, 26000, 25500, 27000, 26500, 28000]
    }


@pytest.fixture
def sample_valuation_request():
    """Sample valuation request for testing."""
    return {
        "name": "Test Valuation",
        "assumptions": {
            "purchase_price": 1000000,
            "loan_amount": 800000,
            "exit_cap_rate": 0.05,
            "hold_period": 5
        }
    }
