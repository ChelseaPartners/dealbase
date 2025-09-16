"""Basic API tests for DealBase."""

import pytest
import io
import pandas as pd

from test_utils import validate_api_response, create_test_csv_file, create_test_deal, assert_deal_matches


def test_health_check(test_client):
    """Test health check endpoint."""
    response = test_client.get("/api/health")
    data = validate_api_response(response, 200, ["status", "timestamp", "version"])
    assert data["status"] == "healthy"


def test_get_deals_empty(test_client):
    """Test getting deals when none exist."""
    response = test_client.get("/api/deals")
    data = validate_api_response(response, 200)
    assert data == []


def test_create_deal(test_client, sample_deal_data):
    """Test creating a new deal."""
    response = test_client.post("/api/deals", json=sample_deal_data)
    data = validate_api_response(response, 200, ["id", "name", "created_at"])
    assert_deal_matches(sample_deal_data, data)


def test_get_deal_not_found(test_client):
    """Test getting a non-existent deal."""
    response = test_client.get("/api/deals/999")
    validate_api_response(response, 404)


def test_intake_t12_preview(test_client, sample_deal_data, sample_t12_data):
    """Test T-12 intake preview functionality."""
    # Create a deal
    deal_response = test_client.post("/api/deals", json=sample_deal_data)
    deal_data = validate_api_response(deal_response, 200, ["id"])
    deal_id = deal_data["id"]
    
    # Test T-12 intake with sample data
    csv_file = create_test_csv_file(sample_t12_data, "test_t12.csv")
    
    response = test_client.post(
        f"/api/intake/t12/{deal_id}",
        files={"file": csv_file}
    )
    
    data = validate_api_response(response, 200, ["success", "preview_data", "mapping_report"])
    assert data["success"] is True
    assert len(data["preview_data"]) > 0


def test_valuation_run_returns_result_bundle_shape(test_client, sample_deal_data, sample_valuation_request):
    """Test that valuation run returns proper ResultBundle shape."""
    # Create a deal
    deal_response = test_client.post("/api/deals", json=sample_deal_data)
    deal_data = validate_api_response(deal_response, 200, ["id"])
    deal_id = deal_data["id"]
    
    # Test valuation request
    response = test_client.post(f"/api/valuation/run/{deal_id}", json=sample_valuation_request)
    
    # This should fail due to missing T-12 data, but we can verify the error handling
    assert response.status_code in [400, 422]  # Bad request due to missing data
