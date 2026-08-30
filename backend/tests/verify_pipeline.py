#!/usr/bin/env python3
"""
End-to-End Verification Script for the AML Pipeline.

Verifies:
1. Synthetic dataset generation (train: 2000 rows, test: 500 rows).
2. Dataset registration in registry.py.
3. Graph tensor building via build_graph.py and presence of .pt files.
4. Model training via engine.py and presence of model weights.
5. Model inference via engine.py.
6. Schema and content integrity of training metrics and inference graph JSON files.
7. Dataset deletion and cleanup audit via registry.delete_dataset().
"""

import os
import sys
import json
import pathlib
import pandas as pd

# Ensure repository root is on sys.path
_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(_TESTS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.pipeline import generate_data, registry, build_graph, engine


def _save_csv(df: pd.DataFrame, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)


def _assert_file_exists(path: str, description: str) -> None:
    if not os.path.exists(path):
        raise FileNotFoundError(f"❌ Verification failed: {description} not found at '{path}'")
    print(f"  ✓ {description} exists: {path}")


def main():
    print("==================================================")
    print("    AML Pipeline End-to-End Health Verification   ")
    print("==================================================\n")

    # ----------------------------------------------------
    # 1. Generate Synthetic Data
    # ----------------------------------------------------
    print("[Step 1] Generating synthetic datasets...")
    train_df = generate_data.generate_transactions(num_records=2000, is_test=False)
    test_df = generate_data.generate_transactions(num_records=500, is_test=True)
    print(f"  ✓ Generated Train CSV shape: {train_df.shape}")
    print(f"  ✓ Generated Test CSV shape:  {test_df.shape}\n")

    # ----------------------------------------------------
    # 2. Register Datasets & Save Raw CSVs
    # ----------------------------------------------------
    print("[Step 2] Registering datasets and saving CSV files...")
    raw_train_dir = os.path.join(REPO_ROOT, "backend", "data", "raw_train")
    raw_test_dir = os.path.join(REPO_ROOT, "backend", "data", "raw_test")

    train_id = registry.register_dataset("Verify_Train_2000", "train", "")
    train_csv_path = os.path.join(raw_train_dir, f"{train_id}.csv")
    _save_csv(train_df, train_csv_path)
    registry.update_dataset_status(train_id, "raw", {"raw_csv": train_csv_path})
    print(f"  ✓ Registered Train Dataset ID: {train_id}")

    test_id = registry.register_dataset("Verify_Test_500", "test", "")
    test_csv_path = os.path.join(raw_test_dir, f"{test_id}.csv")
    _save_csv(test_df, test_csv_path)
    registry.update_dataset_status(test_id, "raw", {"raw_csv": test_csv_path})
    print(f"  ✓ Registered Test Dataset ID:  {test_id}\n")

    # ----------------------------------------------------
    # 3. Convert CSVs to PyG Tensors
    # ----------------------------------------------------
    print("[Step 3] Converting CSVs to PyG graph tensors...")
    build_graph.convert_csv_to_tensor(train_id)
    build_graph.convert_csv_to_tensor(test_id)

    train_pt_path = os.path.join(REPO_ROOT, "backend", "data", "processed", "train", f"{train_id}.pt")
    test_pt_path = os.path.join(REPO_ROOT, "backend", "data", "processed", "test", f"{test_id}.pt")

    _assert_file_exists(train_pt_path, "Train PyG tensor (.pt)")
    _assert_file_exists(test_pt_path, "Test PyG tensor (.pt)")
    print()

    # ----------------------------------------------------
    # 4. Train Model
    # ----------------------------------------------------
    print("[Step 4] Training GNN model...")
    engine.process_graph(train_id)

    weights_path = os.path.join(REPO_ROOT, "backend", "data", "models", f"{train_id}_gnn_weights.pt")
    _assert_file_exists(weights_path, "Model weights (.pt)")
    print()

    # ----------------------------------------------------
    # 5. Run Inference
    # ----------------------------------------------------
    print("[Step 5] Running inference on test dataset...")
    engine.process_graph(test_id, train_dataset_id=train_id)
    print()

    # ----------------------------------------------------
    # 6. Deep Content & Schema Checks
    # ----------------------------------------------------
    print("[Step 6] Performing deep content and schema checks...")
    metrics_path = os.path.join(REPO_ROOT, "backend", "data", "exports", "metrics", f"{train_id}_metrics.json")
    _assert_file_exists(metrics_path, "Frontend training metrics JSON")

    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics_json = json.load(f)

    if "history" not in metrics_json or not isinstance(metrics_json["history"], list):
        raise ValueError(f"❌ Schema error: 'history' list missing in {metrics_path}")
    if "metrics" not in metrics_json or not isinstance(metrics_json["metrics"], dict):
        raise ValueError(f"❌ Schema error: 'metrics' dict missing in {metrics_path}")

    required_metrics = ["accuracy", "precision", "recall", "f1"]
    for m_key in required_metrics:
        val = metrics_json["metrics"].get(m_key)
        if val is None or not isinstance(val, (int, float)):
            raise ValueError(f"❌ Schema error: metric '{m_key}' is missing or non-numeric (val={val})")
    print("  ✓ Metrics JSON contains valid 'history' list and numeric accuracy/precision/recall/f1.")

    graph_results_path = os.path.join(REPO_ROOT, "backend", "data", "exports", "graphs", f"{test_id}_results.json")
    _assert_file_exists(graph_results_path, "Frontend inference graph results JSON")

    with open(graph_results_path, "r", encoding="utf-8") as f:
        graph_json = json.load(f)

    if "nodes" not in graph_json or not isinstance(graph_json["nodes"], list):
        raise ValueError(f"❌ Schema error: 'nodes' list missing in {graph_results_path}")
    if "links" not in graph_json or not isinstance(graph_json["links"], list):
        raise ValueError(f"❌ Schema error: 'links' list missing in {graph_results_path}")
    if len(graph_json["nodes"]) == 0:
        raise ValueError(f"❌ Content error: 'nodes' list is empty in {graph_results_path}")

    required_node_attrs = ["id", "account_id", "in_degree", "retention", "betti_1", "risk_score"]
    sample_node = graph_json["nodes"][0]
    for attr in required_node_attrs:
        if attr not in sample_node:
            raise ValueError(f"❌ Schema error: Node missing required attribute '{attr}' in {graph_results_path}")

    for node in graph_json["nodes"]:
        for num_attr in ["in_degree", "retention", "betti_1", "risk_score"]:
            if not isinstance(node[num_attr], (int, float)):
                raise ValueError(f"❌ Schema error: Node property '{num_attr}' is not numeric in node {node['id']}")

    print(f"  ✓ Inference graph JSON contains top-level 'nodes' ({len(graph_json['nodes'])} nodes) and 'links' ({len(graph_json['links'])} links).")
    print("  ✓ Node schema verified (id, account_id, in_degree, retention, betti_1, risk_score).\n")

    # ----------------------------------------------------
    # 7. Cleanup Audit
    # ----------------------------------------------------
    print("[Step 7] Performing cleanup audit...")
    test_dataset_info = registry.get_dataset(test_id)
    files_to_check = []
    for p_key, p_val in test_dataset_info["paths"].items():
        if p_val:
            abs_p = registry.resolve_path(p_val)
            files_to_check.append(abs_p)

    print(f"  Deleting dataset {test_id} from registry...")
    registry.delete_dataset(test_id)

    # Verify dataset removed from registry
    all_datasets = registry.get_all_datasets()
    if test_id in all_datasets:
        raise RuntimeError(f"❌ Cleanup audit failed: Dataset {test_id} still present in registry.")
    print("  ✓ Dataset removed from registry.json")

    # Verify associated files deleted from disk
    for file_path in files_to_check:
        if os.path.exists(file_path):
            raise RuntimeError(f"❌ Cleanup audit failed: File '{file_path}' was not deleted from disk.")
        print(f"  ✓ Confirmed file deleted: {file_path}")

    # Clean up train dataset as well to keep workspace tidy
    registry.delete_dataset(train_id)
    print(f"  ✓ Cleaned up train dataset {train_id}.\n")

    print("==================================================")
    print("🎉 ALL PIPELINE VERIFICATION CHECKS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    main()
