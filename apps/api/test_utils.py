"""Test utilities for DealBase API tests."""

import io
import pandas as pd
from fastapi.testclient import TestClient
from typing import Dict, Any, Optional


def validate_api_response(
    response, 
    expected_status: int = 200, 
    expected_keys: Optional[list] = None
) -> Dict[str, Any]:
    """Validate API response with standard checks."""
    assert response.status_code == expected_status, f"Expected {expected_status}, got {response.status_code}: {response.text}"
    
    data = response.json()
    
    if expected_keys:
        for key in expected_keys:
            assert key in data, f"Expected key '{key}' not found in response: {data}"
    
    return data


def create_test_csv_file(data: Dict[str, list], filename: str = "test.csv") -> tuple:
    """Create a test CSV file for upload testing."""
    df = pd.DataFrame(data)
    csv_content = df.to_csv(index=False)
    
    return (
        filename,
        io.BytesIO(csv_content.encode()),
        "text/csv"
    )


def create_test_deal(client: TestClient, deal_data: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to create a test deal and return the response data."""
    response = client.post("/api/deals", json=deal_data)
    validate_api_response(response, 200, ["id", "name", "created_at"])
    return response.json()


def assert_deal_matches(deal_data: Dict[str, Any], response_data: Dict[str, Any]) -> None:
    """Assert that deal response matches input data."""
    for key in ["name", "property_type", "address", "city", "state", "zip_code"]:
        assert response_data[key] == deal_data[key], f"Mismatch for {key}: {response_data[key]} != {deal_data[key]}"
    
    # Check that ID and timestamps were added
    assert "id" in response_data
    assert "created_at" in response_data
    assert "updated_at" in response_data
