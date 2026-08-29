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

def convert_csv_to_tensor(dataset_id: str):
    dataset_info = registry.get_dataset(dataset_id)
    input_csv_path = dataset_info["paths"]["raw_csv"]
    is_labeled = (dataset_info["type"] == "train")
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    output_pt_path = os.path.join(BASE_DIR, "..", "data", "processed", f"{dataset_id}.pt")
    
    print(f"Processing {input_csv_path} for dataset {dataset_id}...")
    df = pd.read_csv(input_csv_path)
    
    # Create directed graph
    G = nx.DiGraph()
    # Add all nodes and edges to compute networkx properties properly
    
    nodes = set(df['sender_account']).union(set(df['receiver_account']))
    G.add_nodes_from(nodes)
    
    # Track amounts to calculate retention coefficient
    inflow = {node: 0.0 for node in nodes}
    outflow = {node: 0.0 for node in nodes}
    node_fraud = {node: 0.0 for node in nodes}
    
    for _, row in df.iterrows():
        u = row['sender_account']
        v = row['receiver_account']
        amt = row['amount']
        G.add_edge(u, v)
        outflow[u] += amt
        inflow[v] += amt
        if is_labeled and row['is_fraud'] == 1:
            node_fraud[u] = 1.0
            node_fraud[v] = 1.0
        
    node_list = list(nodes)
    node_to_idx = {node: i for i, node in enumerate(node_list)}
    
    in_degrees = dict(G.in_degree())
    out_degrees = dict(G.out_degree())
    clustering = nx.clustering(G)
    
    # Topological features: find simple cycles (length 3 to 5)
    cycle_nodes = set()
    # Use length_bound if available, otherwise filter manually
    try:
        cycles = nx.simple_cycles(G, length_bound=5)
    except TypeError:
        # Fallback for older networkx versions
        cycles = itertools.islice(nx.simple_cycles(G), 1000)
        
    for cycle in cycles:
        if 3 <= len(cycle) <= 5:
            cycle_nodes.update(cycle)
            
    # Build node feature matrix x
    x = []
    for node in node_list:
        in_deg = in_degrees[node]
        out_deg = out_degrees[node]
        cc = clustering[node]
        retention = (inflow[node] - outflow[node]) / (inflow[node] + outflow[node] + 1e-5)
        betti_flag = 1.0 if node in cycle_nodes else 0.0
        
        x.append([in_deg, out_deg, cc, retention, betti_flag])
        
    x_tensor = torch.tensor(x, dtype=torch.float)
    
    # Build edge index
    sources = [node_to_idx[row['sender_account']] for _, row in df.iterrows()]
    targets = [node_to_idx[row['receiver_account']] for _, row in df.iterrows()]
    edge_index = torch.tensor([sources, targets], dtype=torch.long)
    
    data = Data(x=x_tensor, edge_index=edge_index)
    data.node_ids = node_list
    
    if is_labeled:
        y_vals = [node_fraud[node] for node in node_list]
        y_tensor = torch.tensor(y_vals, dtype=torch.float)
        data.y = y_tensor
    else:
        data.y = None
        
    # Save the Data object
    os.makedirs(os.path.dirname(output_pt_path), exist_ok=True)
    torch.save(data, output_pt_path)
    print(f"Saved PyTorch Geometric Data object to {output_pt_path}")
    
    registry.update_dataset_status(dataset_id, "tensor_built", {"tensor": output_pt_path})

if __name__ == "__main__":
    print("Please import and use convert_csv_to_tensor(dataset_id) directly.")
