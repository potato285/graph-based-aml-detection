# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
import json
import os
import sys

_PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_PIPELINE_DIR, "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from backend.pipeline import registry
from backend.pipeline.model import FraudGATv2
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _pipeline_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _model_weights_path(dataset_id: str) -> str:
    """Absolute path to the GNN weight file, namespaced by dataset_id."""
    return os.path.abspath(
        os.path.join(_pipeline_dir(), "..", "data", "models", f"{dataset_id}_gnn_weights.pt")
    )


def _metrics_path(dataset_id: str) -> str:
    """Absolute path for the training-metrics JSON consumed by the frontend."""
    return os.path.abspath(
        os.path.join(
            _pipeline_dir(), "..", "..", "frontend", "public", "metrics",
            f"{dataset_id}_metrics.json",
        )
    )


def _graph_results_path(dataset_id: str) -> str:
    """Absolute path for the inference graph JSON consumed by the frontend."""
    return os.path.abspath(
        os.path.join(
            _pipeline_dir(), "..", "..", "frontend", "public", "graphs",
            f"{dataset_id}_results.json",
        )
    )


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_model(data, dataset_id: str) -> None:
    """
    Train a FraudGATv2 model on `data`, persist weights, write a metrics JSON,
    and update the registry (status → 'trained', paths.metrics → relative path).
    """
    print("--- Training Model ---")
    model = FraudGATv2(in_channels=5, hidden_channels=16, heads=4, out_channels=1)

    # Class-imbalance weighting
    y          = data.y
    num_safe   = (y == 0).sum().item()
    num_fraud  = (y == 1).sum().item()
    pos_weight = (
        torch.tensor([num_safe / num_fraud], dtype=torch.float)
        if num_fraud > 0
        else torch.tensor([1.0], dtype=torch.float)
    )

    print(f"  Class distribution: Safe={num_safe}, Fraud={num_fraud}")
    print(f"  pos_weight: {pos_weight.item():.2f}")

    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    model.train()
    history = []

    for epoch in range(1, 101):
        optimizer.zero_grad()
        out  = model(data.x, data.edge_index).squeeze()
        loss = criterion(out, data.y)
        loss.backward()
        optimizer.step()
        history.append({"epoch": epoch, "loss": loss.item()})
        if epoch % 20 == 0:
            print(f"  Epoch {epoch:03d}  Loss: {loss.item():.4f}")

    # ---- Evaluation --------------------------------------------------------
    model.eval()
    with torch.no_grad():
        out   = model(data.x, data.edge_index).squeeze()
        probs = torch.sigmoid(out)
        preds = (probs > 0.5).float()

    y_true = data.y.numpy()
    y_pred = preds.numpy()

    acc  = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec  = recall_score(y_true, y_pred, zero_division=0)
    f1   = f1_score(y_true, y_pred, zero_division=0)

    print("\n  Final Training Metrics:")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1-Score:  {f1:.4f}\n")

    # ---- Persist metrics JSON ----------------------------------------------
    metrics_dict = {
        "history": history,
        "metrics": {
            "accuracy":  float(acc),
            "precision": float(prec),
            "recall":    float(rec),
            "f1":        float(f1),
        },
    }
    metrics_abs = _metrics_path(dataset_id)
    os.makedirs(os.path.dirname(metrics_abs), exist_ok=True)
    with open(metrics_abs, "w") as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"  Metrics saved → {metrics_abs}")

    # ---- Persist model weights ---------------------------------------------
    weights_abs = _model_weights_path(dataset_id)
    os.makedirs(os.path.dirname(weights_abs), exist_ok=True)
    torch.save(model.state_dict(), weights_abs)
    print(f"  Model weights saved → {weights_abs}\n")

    # Store model weight path in registry (relative)
    registry.update_dataset_status(
        dataset_id,
        "trained",
        {"model_weights": registry.rel_path(weights_abs)}
    )

    # Update metrics
    registry.update_dataset_status(dataset_id, "trained", {"metrics": registry.rel_path(metrics_abs)})


def undo_training(dataset_id: str) -> None:
    """Removes model artifacts and resets registry status."""
    weights_abs = _model_weights_path(dataset_id)
    metrics_abs = _metrics_path(dataset_id)

    if os.path.exists(weights_abs):
        os.remove(weights_abs)
    if os.path.exists(metrics_abs):
        os.remove(metrics_abs)

    registry.update_dataset_status(dataset_id, "uploaded", {"model_weights": None, "metrics": None})
    print(f"  Training undone for {dataset_id}")


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------

def run_inference(data, dataset_id: str, train_dataset_id: str = None) -> None:
    """
    Load trained weights, run inference on `data`, write the graph JSON for
    the frontend, and update the registry
    (status -> 'inferred', paths.graph_results -> relative path).

    Parameters
    ----------
    data             : PyG Data object for the test/infer dataset
    dataset_id       : ID of the dataset being scored
    train_dataset_id : ID of the trained model to load weights from.
                       Must be provided (or auto-resolved before calling this).
    """
    print("--- Running Inference ---")

    weights_abs = _model_weights_path(train_dataset_id or dataset_id)
    if not os.path.exists(weights_abs):
        raise FileNotFoundError(
            f"Model weights not found at {weights_abs}. "
            f"Ensure dataset '{train_dataset_id or dataset_id}' has been trained first."
        )

    model = FraudGATv2(in_channels=5, hidden_channels=16, heads=4, out_channels=1)
    model.load_state_dict(torch.load(weights_abs, weights_only=True))
    model.eval()

    with torch.no_grad():
        out         = model(data.x, data.edge_index).squeeze()
        risk_scores = torch.sigmoid(out).numpy()

    # ---- Build node list ---------------------------------------------------
    num_nodes  = data.x.shape[0]
    nodes_list = []
    for i in range(num_nodes):
        nodes_list.append({
            "id":         i,
            "account_id": data.node_ids[i] if hasattr(data, "node_ids") else f"node_{i}",
            "in_degree":  float(data.x[i, 0].item()),
            "retention":  float(data.x[i, 3].item()),
            "betti_1":    float(data.x[i, 4].item()),
            "risk_score": float(risk_scores[i]),
        })

    # ---- Build link list ---------------------------------------------------
    edge_index = data.edge_index
    links_list = [
        {"source": int(edge_index[0, i].item()), "target": int(edge_index[1, i].item())}
        for i in range(edge_index.shape[1])
    ]

    graph_dict = {"nodes": nodes_list, "links": links_list}

    # ---- Persist graph JSON ------------------------------------------------
    graph_abs = _graph_results_path(dataset_id)
    os.makedirs(os.path.dirname(graph_abs), exist_ok=True)
    with open(graph_abs, "w") as f:
        json.dump(graph_dict, f, indent=2)
    print(f"  Inference complete. Graph JSON saved → {graph_abs}\n")

    # Registry update (rel_path applied inside update_dataset_status)
    registry.update_dataset_status(dataset_id, "inferred", {"graph_results": graph_abs})


# ---------------------------------------------------------------------------
# Orchestrator helpers
# ---------------------------------------------------------------------------

def _resolve_train_dataset_id(explicit_id: str = None) -> str:
    """
    Return a validated train_dataset_id.

    - If `explicit_id` is given, verify it exists and is trained.
    - Otherwise, scan the registry for datasets with status 'trained'.
      Exactly one must exist; raise a clear error if zero or multiple found.
    """
    all_datasets = registry.get_all_datasets()

    if explicit_id is not None:
        if explicit_id not in all_datasets:
            raise ValueError(f"train_dataset_id '{explicit_id}' not found in registry.")
        if all_datasets[explicit_id]["status"] != "trained":
            raise ValueError(
                f"Dataset '{explicit_id}' has status "
                f"'{all_datasets[explicit_id]['status']}', expected 'trained'."
            )
        return explicit_id

    # Auto-detect
    trained = [
        did for did, info in all_datasets.items()
        if info["status"] == "trained"
    ]

    if not trained:
        raise ValueError(
            "No trained dataset found in the registry. "
            "Run process_graph() on a train dataset first."
        )
    if len(trained) > 1:
        raise ValueError(
            f"Multiple trained datasets found: {trained}. "
            "Pass train_dataset_id explicitly to resolve ambiguity."
        )

    resolved = trained[0]
    print(f"[engine] Auto-detected train model: {resolved}")
    return resolved


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def process_graph(dataset_id: str, train_dataset_id: str = None) -> None:
    """
    Top-level entry point. Loads the tensor for `dataset_id` from the
    registry and dispatches to train_model or run_inference.

    Parameters
    ----------
    dataset_id       : The dataset to process (train or test).
    train_dataset_id : For test/infer datasets only — specifies which trained
                       model's weights to load.  If omitted, auto-detected from
                       the registry (works when exactly one trained model exists).
    """
    dataset_info = registry.get_dataset(dataset_id)
    dataset_type = dataset_info["type"]

    # Resolve relative tensor path -> absolute for file I/O
    tensor_path = registry.resolve_path(dataset_info["paths"]["tensor"])

    if not os.path.exists(tensor_path):
        raise FileNotFoundError(
            f"Tensor not found at {tensor_path}. "
            "Did you run convert_csv_to_tensor() first?"
        )

    print(f"[engine] Loading tensor: {tensor_path}")
    data = torch.load(tensor_path, weights_only=False)

    if dataset_type == "train":
        train_model(data, dataset_id)
    else:
        resolved_train_id = _resolve_train_dataset_id(train_dataset_id)
        run_inference(data, dataset_id, train_dataset_id=resolved_train_id)


if __name__ == "__main__":
    print("Please import and call process_graph(dataset_id) directly.")

