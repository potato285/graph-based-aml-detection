#!/usr/bin/env python3
"""Verification script for the AML detection pipeline.

Performs an end‑to‑end run:
1. Generate synthetic train and test CSVs using generate_data.
2. Register both datasets.
3. Convert CSVs to PyG tensors.
4. Train on the training dataset.
5. Run inference on the test dataset (auto‑detects the trained model).
6. Verify that metric and graph JSON files exist in the frontend public folder.
"""
import os
import sys
import pathlib
import pandas as pd

# Ensure repo root is on PYTHONPATH
repo_root = pathlib.Path(__file__).resolve().parents[2]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.pipeline import generate_data, registry, build_graph, engine

def _save_csv(df: pd.DataFrame, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)

def _verify_file(path: str, description: str) -> None:
    if not os.path.exists(path):
        raise FileNotFoundError(f"{description} not found at {path}")
    print(f"✅ {description} exists: {path}")

def main():
    # 1. Generate synthetic datasets
    train_df = generate_data.generate_transactions(num_records=2000, is_test=False)
    
    # 2. Register datasets
    train_id = registry.register_dataset("Synthetic Train", "train", "")
    
    # 3. Write CSV files and update registry with relative paths
    raw_train_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw_train"))
    raw_test_dir  = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw_test"))
    train_csv = os.path.join(raw_train_dir, f"{train_id}.csv")
    _save_csv(train_df, train_csv)
    registry.update_dataset_status(train_id, "raw", {"raw_csv": train_csv})
    print(f"Registered train_id={train_id}")

    # Generate and register multiple test sets
    test_ids = []
    for i in range(3):
        test_df = generate_data.generate_transactions(num_records=500, is_test=True)
        test_id = registry.register_dataset(f"Synthetic Test {i}", "test", "")
        test_csv = os.path.join(raw_test_dir, f"{test_id}.csv")
        _save_csv(test_df, test_csv)
        registry.update_dataset_status(test_id, "raw", {"raw_csv": test_csv})
        test_ids.append(test_id)
        print(f"Registered test_id={test_id}")

    # 4. Convert to tensors
    build_graph.convert_csv_to_tensor(train_id)
    for tid in test_ids:
        build_graph.convert_csv_to_tensor(tid)

    # 5. Train on training set
    engine.process_graph(train_id)

    # 6. Inference on all test sets
    for tid in test_ids:
        engine.process_graph(tid, train_dataset_id=train_id)
        graph_path = os.path.abspath(os.path.join(repo_root, "frontend", "public", "graphs", f"{tid}_results.json"))
        _verify_file(graph_path, f"Inference graph JSON for test {tid}")

    # 7. Verify training metrics JSON
    metrics_path = os.path.abspath(os.path.join(repo_root, "frontend", "public", "metrics", f"{train_id}_metrics.json"))
    _verify_file(metrics_path, "Training metrics JSON")
    print("\nAll verification steps passed.")

if __name__ == "__main__":
    main()
