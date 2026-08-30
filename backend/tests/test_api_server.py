#!/usr/bin/env python3
"""
Functional Integration Tests for the FastAPI Backend.
Uses FastAPI TestClient to verify endpoints, static mounts, and pipeline runs.
"""

import os
import sys
import io
import json
import pathlib
import pandas as pd
from fastapi.testclient import TestClient

# Ensure repository root is on sys.path
_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(_TESTS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.main import app
from backend.pipeline import generate_data, registry

client = TestClient(app)


def test_cors_headers():
    print("--------------------------------------------------")
    print("Test: CORS Header Validation")
    print("--------------------------------------------------")
    # Verify CORS headers for http://localhost:5173
    response = client.get("/api/datasets", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    print("  ✓ CORS allow-origin header confirmed for http://localhost:5173")

    # Verify CORS headers for http://localhost:3000
    response = client.get("/api/datasets", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    print("  ✓ CORS allow-origin header confirmed for http://localhost:3000")

    # Verify CORS headers reject unsupported origin (returns no CORS header or doesn't match)
    response = client.get("/api/datasets", headers={"Origin": "http://malicious-site.com"})
    assert response.headers.get("access-control-allow-origin") is None
    print("  ✓ CORS successfully blocked malicious-site.com origin\n")


def test_end_to_end_lifecycle():
    print("--------------------------------------------------")
    print("Test: End-to-End AML API Lifecycle")
    print("--------------------------------------------------")

    # Step A: GET /api/datasets
    print("[Step A] Fetching empty/initial registry...")
    response = client.get("/api/datasets")
    assert response.status_code == 200
    initial_registry = response.json()
    assert isinstance(initial_registry, dict)
    print("  ✓ Initial registry fetched successfully")

    # Generate small transaction CSV data for tests
    train_df = generate_data.generate_transactions(num_records=100, is_test=False)
    test_df = generate_data.generate_transactions(num_records=50, is_test=True)

    # Convert to CSV string bytes
    train_csv_bytes = io.BytesIO()
    train_df.to_csv(train_csv_bytes, index=False)
    train_csv_bytes.seek(0)

    test_csv_bytes = io.BytesIO()
    test_df.to_csv(test_csv_bytes, index=False)
    test_csv_bytes.seek(0)

    # Step B: POST /api/datasets/upload (Train CSV)
    print("[Step B] Uploading synthetic Train CSV...")
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("train.csv", train_csv_bytes, "text/csv")},
        data={"displayName": "Integration_Train_Set", "type": "train"}
    )
    assert response.status_code == 200
    train_upload_data = response.json()
    train_id = train_upload_data["dataset_id"]
    assert train_upload_data["type"] == "train"
    assert train_upload_data["status"] == "raw"
    print(f"  ✓ Train dataset uploaded. Received train_id: {train_id}")

    # Step C: POST /api/datasets/{train_id}/train
    print(f"[Step C] Triggering GNN model training on train_id={train_id}...")
    response = client.post(f"/api/datasets/{train_id}/train")
    assert response.status_code == 200
    train_pipeline_data = response.json()
    assert train_pipeline_data["status"] == "trained"
    print("  ✓ Training complete. Registry updated to 'trained' state")

    # Step D: GET /static/metrics/{train_id}_metrics.json
    print(f"[Step D] Fetching metrics from static server for train_id={train_id}...")
    response = client.get(f"/static/metrics/{train_id}_metrics.json")
    assert response.status_code == 200
    metrics_json = response.json()
    assert "history" in metrics_json
    assert "metrics" in metrics_json
    for metric_key in ["accuracy", "precision", "recall", "f1"]:
        assert isinstance(metrics_json["metrics"][metric_key], (int, float))
    print("  ✓ Validated static served metrics JSON schema")

    # Step E: POST /api/datasets/upload (Test CSV)
    print("[Step E] Uploading synthetic Test CSV...")
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("test.csv", test_csv_bytes, "text/csv")},
        data={"displayName": "Integration_Test_Set", "type": "test"}
    )
    assert response.status_code == 200
    test_upload_data = response.json()
    test_id = test_upload_data["dataset_id"]
    assert test_upload_data["type"] == "test"
    assert test_upload_data["status"] == "raw"
    print(f"  ✓ Test dataset uploaded. Received test_id: {test_id}")

    # Step F: POST /api/datasets/{test_id}/infer
    print(f"[Step F] Running inference on test_id={test_id} using train_id={train_id}...")
    response = client.post(
        f"/api/datasets/{test_id}/infer",
        json={"train_dataset_id": train_id}
    )
    assert response.status_code == 200
    infer_pipeline_data = response.json()
    assert infer_pipeline_data["status"] == "inferred"
    print("  ✓ GNN inference complete. Registry updated to 'inferred' state")

    # Step G: GET /static/graphs/{test_id}_results.json
    print(f"[Step G] Fetching inference graph from static server for test_id={test_id}...")
    response = client.get(f"/static/graphs/{test_id}_results.json")
    assert response.status_code == 200
    graph_json = response.json()
    assert "nodes" in graph_json and isinstance(graph_json["nodes"], list)
    assert "links" in graph_json and isinstance(graph_json["links"], list)
    # Check node attributes
    first_node = graph_json["nodes"][0]
    for attr in ["id", "account_id", "in_degree", "retention", "betti_1", "risk_score"]:
        assert attr in first_node
    print("  ✓ Validated static served GNN inference graph schema")

    # Step H: DELETE /api/datasets/{test_id}
    print(f"[Step H] Cleaning up test dataset test_id={test_id}...")
    # Record test file paths to verify their deletion
    test_info = registry.get_dataset(test_id)
    test_files = [registry.resolve_path(p) for p in test_info["paths"].values() if p]

    response = client.delete(f"/api/datasets/{test_id}")
    assert response.status_code == 200
    print("  ✓ Delete API request completed successfully")

    # Confirm test files deleted from disk
    for file_path in test_files:
        assert not os.path.exists(file_path), f"File was not deleted: {file_path}"
    print("  ✓ Verified all associated test files deleted from disk")

    # Cleanup train dataset as well to keep workspace tidy
    response = client.delete(f"/api/datasets/{train_id}")
    assert response.status_code == 200
    print(f"  ✓ Cleaned up train dataset {train_id}\n")


def main():
    print("==================================================")
    print("    FastAPI REST API Functional Verification      ")
    print("==================================================")
    try:
        test_cors_headers()
        test_end_to_end_lifecycle()
        print("==================================================")
        print("🎉 ALL API SERVER VERIFICATION CHECKS PASSED!")
        print("==================================================")
    except Exception as e:
        print(f"\n❌ Test verification failed with error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
