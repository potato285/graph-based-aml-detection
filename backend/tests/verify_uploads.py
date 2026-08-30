#!/usr/bin/env python3
"""
Functional test verifying dataset upload paths, file system placement, and registry tracking.
"""

import os
import sys
import io
import json
import pathlib
from fastapi.testclient import TestClient

# Ensure repository root is on sys.path
_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(_TESTS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.main import app
from backend.pipeline import registry

client = TestClient(app)


def run_upload_path_audit():
    print("==================================================")
    print("      DATA CONTROL CENTER UPLOAD PATH AUDIT       ")
    print("==================================================")

    # 1. Create a dummy CSV payload
    dummy_csv = "sender_account,receiver_account,amount,is_fraud\nACC_1,ACC_2,100.50,0\nACC_2,ACC_3,100.50,0\n"

    # 2. Ingest Train Dataset
    print("\n[Step 1] Ingesting Train Dataset via POST /api/datasets/upload...")
    train_file_stream = io.BytesIO(dummy_csv.encode('utf-8'))
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("train_dummy.csv", train_file_stream, "text/csv")},
        data={"displayName": "Upload Path Audit Train", "type": "train"}
    )
    assert response.status_code == 200, f"Upload failed: {response.text}"
    train_data = response.json()
    train_id = train_data["dataset_id"]
    print(f"  ✓ Upload successful. Assigned ID: {train_id}")

    # 3. Ingest Test Dataset
    print("\n[Step 2] Ingesting Test Dataset via POST /api/datasets/upload...")
    test_file_stream = io.BytesIO(dummy_csv.encode('utf-8'))
    response = client.post(
        "/api/datasets/upload",
        files={"file": ("test_dummy.csv", test_file_stream, "text/csv")},
        data={"displayName": "Upload Path Audit Test", "type": "test"}
    )
    assert response.status_code == 200, f"Upload failed: {response.text}"
    test_data = response.json()
    test_id = test_data["dataset_id"]
    print(f"  ✓ Upload successful. Assigned ID: {test_id}")

    # 4. Verify physical file system placement
    print("\n[Step 3] Verifying file system placement...")
    expected_train_path = os.path.join(REPO_ROOT, "backend", "data", "raw_train", f"{train_id}.csv")
    expected_test_path = os.path.join(REPO_ROOT, "backend", "data", "raw_test", f"{test_id}.csv")

    assert os.path.exists(expected_train_path), f"Train file not found at {expected_train_path}"
    print(f"  ✓ Train file correctly written to: {expected_train_path}")

    assert os.path.exists(expected_test_path), f"Test file not found at {expected_test_path}"
    print(f"  ✓ Test file correctly written to: {expected_test_path}")

    # 5. Verify registry contents & states
    print("\n[Step 4] Reading registry.json to verify status tracking...")
    # Load registry
    all_datasets = registry.get_all_datasets()
    
    assert train_id in all_datasets, f"Train ID {train_id} missing from registry"
    train_registry_entry = all_datasets[train_id]
    assert train_registry_entry["status"] == "raw", f"Expected status 'raw', got: {train_registry_entry['status']}"
    assert train_registry_entry["type"] == "train", f"Expected type 'train', got: {train_registry_entry['type']}"
    print(f"  ✓ Registry record for {train_id} verified: status='raw', type='train'")

    assert test_id in all_datasets, f"Test ID {test_id} missing from registry"
    test_registry_entry = all_datasets[test_id]
    assert test_registry_entry["status"] == "raw", f"Expected status 'raw', got: {test_registry_entry['status']}"
    assert test_registry_entry["type"] == "test", f"Expected type 'test', got: {test_registry_entry['type']}"
    print(f"  ✓ Registry record for {test_id} verified: status='raw', type='test'")

    # 6. Cleanup & Purge Check
    print("\n[Step 5] Triggering deletion cleanup via registry.delete_dataset()...")
    
    print(f"  Deleting Train Dataset {train_id}...")
    registry.delete_dataset(train_id)
    assert not os.path.exists(expected_train_path), "Train CSV file was not deleted from disk"
    print("  ✓ Train CSV deleted from file system")

    print(f"  Deleting Test Dataset {test_id}...")
    registry.delete_dataset(test_id)
    assert not os.path.exists(expected_test_path), "Test CSV file was not deleted from disk"
    print("  ✓ Test CSV deleted from file system")

    # Confirm removed from registry
    latest_registry = registry.get_all_datasets()
    assert train_id not in latest_registry, "Train dataset still in registry"
    assert test_id not in latest_registry, "Test dataset still in registry"
    print("  ✓ Both datasets removed from registry.json database")

    print("\n==================================================")
    print("🎉 ALL UPLOAD PATH AUDIT CHECKS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    try:
        run_upload_path_audit()
    except Exception as e:
        print(f"\n❌ Audit failed: {str(e)}")
        sys.exit(1)
