import pandas as pd
import networkx as nx
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
from torch_geometric.data import Data
import numpy as np
import os
import itertools
import registry

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def convert_csv_to_tensor(dataset_id: str) -> None:
    """
    Read the raw CSV for `dataset_id`, build a PyTorch Geometric Data object,
    and save it to:
        backend/data/processed/<type>/<dataset_id>.pt

    The registry entry is updated with:
      - status  → "tensor_built"
      - paths.tensor → relative path to the saved .pt file
    """
    dataset_info = registry.get_dataset(dataset_id)

    # Resolve raw CSV path (stored as relative in registry)
    input_csv_path = registry.resolve_path(dataset_info["paths"]["raw_csv"])
    dataset_type   = dataset_info["type"]           # "train" or "test"
    is_labeled     = (dataset_type == "train")

    # ---- Output path: backend/data/processed/<type>/<id>.pt ----------------
    _PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
    output_dir    = os.path.abspath(
        os.path.join(_PIPELINE_DIR, "..", "data", "processed", dataset_type)
    )
    os.makedirs(output_dir, exist_ok=True)
    output_pt_path = os.path.join(output_dir, f"{dataset_id}.pt")

    print(f"[build_graph] Processing {input_csv_path} → {output_pt_path}")
    df = pd.read_csv(input_csv_path)

    # ---- Build directed graph ----------------------------------------------
    G     = nx.DiGraph()
    nodes = set(df["sender_account"]).union(set(df["receiver_account"]))
    G.add_nodes_from(nodes)

    inflow     = {n: 0.0 for n in nodes}
    outflow    = {n: 0.0 for n in nodes}
    node_fraud = {n: 0.0 for n in nodes}

    for _, row in df.iterrows():
        u   = row["sender_account"]
        v   = row["receiver_account"]
        amt = row["amount"]
        G.add_edge(u, v)
        outflow[u] += amt
        inflow[v]  += amt
        if is_labeled and row["is_fraud"] == 1:
            node_fraud[u] = 1.0
            node_fraud[v] = 1.0

    # ---- Node ordering & index map -----------------------------------------
    node_list   = list(nodes)
    node_to_idx = {node: i for i, node in enumerate(node_list)}

    # ---- NetworkX graph features -------------------------------------------
    in_degrees  = dict(G.in_degree())
    out_degrees = dict(G.out_degree())
    clustering  = nx.clustering(G)

    # Topological feature: flag nodes that participate in simple cycles (len 3–5)
    cycle_nodes = set()
    try:
        cycles = nx.simple_cycles(G, length_bound=5)
    except TypeError:
        # Fallback for older NetworkX versions
        cycles = itertools.islice(nx.simple_cycles(G), 1000)

    for cycle in cycles:
        if 3 <= len(cycle) <= 5:
            cycle_nodes.update(cycle)

    # ---- Feature matrix x  [in_deg, out_deg, clustering, retention, betti] -
    x = []
    for node in node_list:
        in_deg    = float(in_degrees[node])
        out_deg   = float(out_degrees[node])
        cc        = float(clustering[node])
        # Retention bounded to (-1, 1) — prevents gradient explosion
        retention = (inflow[node] - outflow[node]) / (
            inflow[node] + outflow[node] + 1e-5
        )
        betti_flag = 1.0 if node in cycle_nodes else 0.0
        x.append([in_deg, out_deg, cc, retention, betti_flag])

    x_tensor = torch.tensor(x, dtype=torch.float)

    # ---- Edge index (COO format) -------------------------------------------
    sources    = [node_to_idx[row["sender_account"]]   for _, row in df.iterrows()]
    targets    = [node_to_idx[row["receiver_account"]] for _, row in df.iterrows()]
    edge_index = torch.tensor([sources, targets], dtype=torch.long)

    # ---- Assemble PyG Data object ------------------------------------------
    data          = Data(x=x_tensor, edge_index=edge_index)
    data.node_ids = node_list   # preserve original account IDs for the frontend

    if is_labeled:
        y_vals = [node_fraud[node] for node in node_list]
        data.y = torch.tensor(y_vals, dtype=torch.float)
    else:
        data.y = None

    # ---- Persist tensor ----------------------------------------------------
    torch.save(data, output_pt_path)
    print(f"[build_graph] Saved tensor → {output_pt_path}")

    # ---- Update registry (store relative path) -----------------------------
    registry.update_dataset_status(
        dataset_id,
        "tensor_built",
        {"tensor": output_pt_path},   # registry.update converts to relative path
    )


if __name__ == "__main__":
    print("Please import and call convert_csv_to_tensor(dataset_id) directly.")
