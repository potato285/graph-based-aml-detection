import pandas as pd
import networkx as nx
import torch
from torch_geometric.data import Data
import numpy as np
import os

def convert_csv_to_tensor(input_csv_path: str, output_pt_path: str, is_labeled: bool):
    print(f"Processing {input_csv_path}...")
    df = pd.read_csv(input_csv_path)
    
    # Create directed graph
    G = nx.DiGraph()
    # Add all nodes and edges to compute networkx properties properly
    
    nodes = set(df['sender_account']).union(set(df['receiver_account']))
    G.add_nodes_from(nodes)
    
    # Track amounts to calculate retention coefficient
    inflow = {node: 0.0 for node in nodes}
    outflow = {node: 0.0 for node in nodes}
    
    for _, row in df.iterrows():
        u = row['sender_account']
        v = row['receiver_account']
        amt = row['amount']
        G.add_edge(u, v)
        outflow[u] += amt
        inflow[v] += amt
        
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
        cycles = nx.simple_cycles(G)
        
    for cycle in cycles:
        if 3 <= len(cycle) <= 5:
            cycle_nodes.update(cycle)
            
    # Build node feature matrix x
    x = []
    for node in node_list:
        in_deg = in_degrees[node]
        out_deg = out_degrees[node]
        cc = clustering[node]
        retention = outflow[node] / (inflow[node] + 1e-5)
        betti_flag = 1.0 if node in cycle_nodes else 0.0
        
        x.append([in_deg, out_deg, cc, retention, betti_flag])
        
    x_tensor = torch.tensor(x, dtype=torch.float)
    
    # Build edge index
    sources = [node_to_idx[row['sender_account']] for _, row in df.iterrows()]
    targets = [node_to_idx[row['receiver_account']] for _, row in df.iterrows()]
    edge_index = torch.tensor([sources, targets], dtype=torch.long)
    
    data = Data(x=x_tensor, edge_index=edge_index)
    
    if is_labeled:
        y_tensor = torch.tensor(df['is_fraud'].values, dtype=torch.float)
        data.y = y_tensor
    else:
        data.y = None
        
    # Save the Data object
    os.makedirs(os.path.dirname(output_pt_path), exist_ok=True)
    torch.save(data, output_pt_path)
    print(f"Saved PyTorch Geometric Data object to {output_pt_path}")

if __name__ == "__main__":
    # Base paths assuming this script is run from backend/pipeline/
    train_input = "../data/raw_train/train_dataset.csv"
    train_output = "../data/processed/train_tensor.pt"
    
    test_input = "../data/raw_test/test_dataset.csv"
    test_output = "../data/processed/test_tensor.pt"
    
    convert_csv_to_tensor(train_input, train_output, is_labeled=True)
    convert_csv_to_tensor(test_input, test_output, is_labeled=False)
