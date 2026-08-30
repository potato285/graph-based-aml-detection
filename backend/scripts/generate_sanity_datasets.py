#!/usr/bin/env python3
"""
Synthetic AML Dataset Generator for sanity checks.
Outputs three specific transaction CSV files directly to the Downloads folder:
- aml_train_10k.csv (10,000 txs, ~20% fraud, mixed motifs)
- aml_test_200nodes_600tx.csv (~200 nodes, ~600 txs, 5-6 syndicates, 35-40 nodes)
- aml_test_5k.csv (5,000 txs, ~15% fraud, > 400 nodes)
"""

import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def get_downloads_dir():
    # Cross-platform way to get Downloads folder
    return os.path.join(os.path.expanduser("~"), "Downloads")

# ---------------------------------------------------------------------------
# Motif/Topology Generators
# ---------------------------------------------------------------------------

def generate_loop(nodes, base_amount, start_time):
    txs = []
    current_time = start_time
    amount = base_amount
    for i in range(len(nodes)):
        u = nodes[i]
        v = nodes[(i + 1) % len(nodes)]
        # Add a tiny reduction to simulate transaction fees/splitting
        amount = round(amount * random.uniform(0.98, 0.995), 2)
        txs.append({
            "timestamp": current_time.isoformat(),
            "source": u,
            "target": v,
            "amount": amount,
            "IsLaundering": 1
        })
        current_time += timedelta(minutes=random.randint(5, 30))
    return txs, current_time

def generate_funnel(sources, collector, target, base_amount, start_time):
    txs = []
    current_time = start_time
    total_received = 0.0
    for src in sources:
        amount = round((base_amount / len(sources)) * random.uniform(0.95, 1.05), 2)
        txs.append({
            "timestamp": current_time.isoformat(),
            "source": src,
            "target": collector,
            "amount": amount,
            "IsLaundering": 1
        })
        total_received += amount
        current_time += timedelta(minutes=random.randint(2, 15))
    
    # Collector sends to target
    current_time += timedelta(minutes=random.randint(15, 60))
    final_amount = round(total_received * random.uniform(0.97, 0.99), 2)
    txs.append({
        "timestamp": current_time.isoformat(),
        "source": collector,
        "target": target,
        "amount": final_amount,
        "IsLaundering": 1
    })
    return txs, current_time

def generate_scatter(source, targets, base_amount, start_time):
    txs = []
    current_time = start_time
    for tgt in targets:
        amount = round((base_amount / len(targets)) * random.uniform(0.95, 1.05), 2)
        txs.append({
            "timestamp": current_time.isoformat(),
            "source": source,
            "target": tgt,
            "amount": amount,
            "IsLaundering": 1
        })
        current_time += timedelta(minutes=random.randint(2, 15))
    return txs, current_time

def generate_chain(nodes, base_amount, start_time):
    txs = []
    current_time = start_time
    amount = base_amount
    for i in range(len(nodes) - 1):
        u = nodes[i]
        v = nodes[i + 1]
        amount = round(amount * random.uniform(0.98, 0.995), 2)
        txs.append({
            "timestamp": current_time.isoformat(),
            "source": u,
            "target": v,
            "amount": amount,
            "IsLaundering": 1
        })
        current_time += timedelta(minutes=random.randint(10, 45))
    return txs, current_time

# ---------------------------------------------------------------------------
# Background Traffic Generator
# ---------------------------------------------------------------------------

def generate_background_txs(num_tx, nodes_list, start_time, duration_days=30):
    txs = []
    # Weighted distribution modeling power-law (a few hubs, many leaves)
    weights = [1.0 / (i + 1.0) for i in range(len(nodes_list))]
    total_w = sum(weights)
    p_weights = [w / total_w for w in weights]
    
    amounts = np.random.lognormal(mean=4.5, sigma=1.2, size=num_tx)
    amounts = np.clip(amounts, 10.0, 5000.0)
    amounts = np.round(amounts, 2)
    
    for i in range(num_tx):
        u = np.random.choice(nodes_list, p=p_weights)
        v = np.random.choice(nodes_list, p=p_weights)
        while u == v:
            v = np.random.choice(nodes_list, p=p_weights)
            
        random_delta = random.randint(0, duration_days * 24 * 3600)
        tx_time = start_time + timedelta(seconds=random_delta)
        
        txs.append({
            "timestamp": tx_time.isoformat(),
            "source": u,
            "target": v,
            "amount": float(amounts[i]),
            "IsLaundering": 0
        })
    return txs

# ---------------------------------------------------------------------------
# File 1: aml_train_10k.csv
# ---------------------------------------------------------------------------

def generate_train_10k(downloads_dir, start_time):
    print("Generating aml_train_10k.csv...")
    total_tx = 10000
    target_fraud_tx = 2000
    target_bg_tx = 8000
    
    # 1. Background Nodes
    bg_nodes = [f"ACC_B_{i}" for i in range(1, 1500)]
    bg_txs = generate_background_txs(target_bg_tx, bg_nodes, start_time)
    
    # 2. Fraud motifs
    fraud_txs = []
    fraud_node_counter = 1
    
    while len(fraud_txs) < target_fraud_tx:
        remaining = target_fraud_tx - len(fraud_txs)
        pattern_type = random.choice(["loop", "funnel", "scatter", "chain"])
        base_amt = round(random.uniform(1000.0, 20000.0), 2)
        
        # Check size constraints to ensure we hit exactly 2000 fraud transactions
        if remaining < 10:
            # Generate a chain of the exact length to fill remaining
            chain_len = remaining + 1
            node_ids = [f"ACC_F_{fraud_node_counter + j}" for j in range(chain_len)]
            fraud_node_counter += chain_len
            mot_txs, _ = generate_chain(node_ids, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            break
            
        if pattern_type == "loop":
            loop_len = random.randint(3, 6)
            node_ids = [f"ACC_F_{fraud_node_counter + j}" for j in range(loop_len)]
            fraud_node_counter += loop_len
            mot_txs, _ = generate_loop(node_ids, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            
        elif pattern_type == "funnel":
            num_srcs = random.randint(3, 6)
            node_ids = [f"ACC_F_{fraud_node_counter + j}" for j in range(num_srcs + 2)]
            fraud_node_counter += num_srcs + 2
            sources = node_ids[:num_srcs]
            collector = node_ids[num_srcs]
            target = node_ids[num_srcs + 1]
            mot_txs, _ = generate_funnel(sources, collector, target, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            
        elif pattern_type == "scatter":
            num_tgts = random.randint(3, 6)
            node_ids = [f"ACC_F_{fraud_node_counter + j}" for j in range(num_tgts + 1)]
            fraud_node_counter += num_tgts + 1
            source = node_ids[0]
            targets = node_ids[1:]
            mot_txs, _ = generate_scatter(source, targets, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            
        elif pattern_type == "chain":
            chain_len = random.randint(3, 6)
            node_ids = [f"ACC_F_{fraud_node_counter + j}" for j in range(chain_len)]
            fraud_node_counter += chain_len
            mot_txs, _ = generate_chain(node_ids, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)

    # Combine, sort by timestamp
    all_txs = bg_txs + fraud_txs
    df = pd.DataFrame(all_txs)
    df["timestamp_parsed"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp_parsed").drop(columns=["timestamp_parsed"])
    
    # Save to Downloads
    out_path = os.path.join(downloads_dir, "aml_train_10k.csv")
    df.to_csv(out_path, index=False)
    print(f"Saved: {out_path}")
    print_stats(df)

# ---------------------------------------------------------------------------
# File 2: aml_test_200nodes_600tx.csv
# ---------------------------------------------------------------------------

def generate_test_200nodes_600tx(downloads_dir, start_time):
    print("Generating aml_test_200nodes_600tx.csv...")
    # Exact specs:
    # ~200 unique nodes, ~600 transactions.
    # 5 to 6 distinct criminal syndicates comprising ~35-40 total fraudulent nodes.
    
    # Fraud nodes: 36 nodes (ACC_F_1 to ACC_F_36)
    # Background nodes: 164 nodes (ACC_B_1 to ACC_B_164)
    # Total nodes = 200 nodes.
    
    # Syndicates:
    # 1. Smurfing Loop: 6 nodes (ACC_F_1 to ACC_F_6), 6 transactions
    # 2. Funnel Collector: 8 nodes (sources: ACC_F_7..12, collector: ACC_F_13, target: ACC_F_14), 7 transactions
    # 3. Scatter Distributor: 6 nodes (distributor: ACC_F_15, targets: ACC_F_16..20), 5 transactions
    # 4. Pass-Through Chain: 5 nodes (ACC_F_21 to ACC_F_25), 4 transactions
    # 5. Smurfing Loop: 6 nodes (ACC_F_26 to ACC_F_31), 6 transactions
    # 6. Pass-Through Chain: 5 nodes (ACC_F_32 to ACC_F_36), 4 transactions
    # Total fraud nodes = 36 nodes.
    # Total fraud transactions = 6 + 7 + 5 + 4 + 6 + 4 = 32 transactions.
    
    fraud_txs = []
    
    # Syndicate 1 (Loop)
    txs, _ = generate_loop([f"ACC_F_{i}" for i in range(1, 7)], 8500.0, start_time + timedelta(days=2))
    fraud_txs.extend(txs)
    
    # Syndicate 2 (Funnel)
    txs, _ = generate_funnel([f"ACC_F_{i}" for i in range(7, 13)], "ACC_F_13", "ACC_F_14", 12000.0, start_time + timedelta(days=5))
    fraud_txs.extend(txs)
    
    # Syndicate 3 (Scatter)
    txs, _ = generate_scatter("ACC_F_15", [f"ACC_F_{i}" for i in range(16, 21)], 9500.0, start_time + timedelta(days=10))
    fraud_txs.extend(txs)
    
    # Syndicate 4 (Chain)
    txs, _ = generate_chain([f"ACC_F_{i}" for i in range(21, 26)], 7500.0, start_time + timedelta(days=15))
    fraud_txs.extend(txs)
    
    # Syndicate 5 (Loop)
    txs, _ = generate_loop([f"ACC_F_{i}" for i in range(26, 32)], 6000.0, start_time + timedelta(days=20))
    fraud_txs.extend(txs)
    
    # Syndicate 6 (Chain)
    txs, _ = generate_chain([f"ACC_F_{i}" for i in range(32, 37)], 5000.0, start_time + timedelta(days=25))
    fraud_txs.extend(txs)
    
    # Total fraud txs = 32
    # To reach exactly 600 txs, we need 568 background txs.
    bg_nodes = [f"ACC_B_{i}" for i in range(1, 165)]
    bg_txs = generate_background_txs(568, bg_nodes, start_time, duration_days=30)
    
    # Combine, sort
    all_txs = bg_txs + fraud_txs
    df = pd.DataFrame(all_txs)
    df["timestamp_parsed"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp_parsed").drop(columns=["timestamp_parsed"])
    
    # Save to Downloads
    out_path = os.path.join(downloads_dir, "aml_test_200nodes_600tx.csv")
    df.to_csv(out_path, index=False)
    print(f"Saved: {out_path}")
    print_stats(df)

# ---------------------------------------------------------------------------
# File 3: aml_test_5k.csv
# ---------------------------------------------------------------------------

def generate_test_5k(downloads_dir, start_time):
    print("Generating aml_test_5k.csv...")
    total_tx = 5000
    target_fraud_tx = 750
    target_bg_tx = 4250
    
    # We want > 400 nodes in total.
    # Background nodes: 700 nodes (ACC_B_1 to ACC_B_700)
    # Fraud nodes: 100 nodes (ACC_F_1 to ACC_F_100)
    # Total nodes = 800 nodes.
    
    bg_nodes = [f"ACC_B_{i}" for i in range(1, 701)]
    bg_txs = generate_background_txs(target_bg_tx, bg_nodes, start_time)
    
    fraud_txs = []
    fraud_node_counter = 1
    
    while len(fraud_txs) < target_fraud_tx:
        remaining = target_fraud_tx - len(fraud_txs)
        pattern_type = random.choice(["loop", "funnel", "scatter", "chain"])
        base_amt = round(random.uniform(2000.0, 15000.0), 2)
        
        # Check size constraints
        if remaining < 10:
            chain_len = remaining + 1
            node_ids = [f"ACC_F_{(fraud_node_counter + j) % 100 + 1}" for j in range(chain_len)]
            fraud_node_counter += chain_len
            mot_txs, _ = generate_chain(node_ids, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            break
            
        if pattern_type == "loop":
            loop_len = random.randint(3, 6)
            node_ids = [f"ACC_F_{(fraud_node_counter + j) % 100 + 1}" for j in range(loop_len)]
            fraud_node_counter += loop_len
            mot_txs, _ = generate_loop(node_ids, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            
        elif pattern_type == "funnel":
            num_srcs = random.randint(3, 6)
            node_ids = [f"ACC_F_{(fraud_node_counter + j) % 100 + 1}" for j in range(num_srcs + 2)]
            fraud_node_counter += num_srcs + 2
            sources = node_ids[:num_srcs]
            collector = node_ids[num_srcs]
            target = node_ids[num_srcs + 1]
            mot_txs, _ = generate_funnel(sources, collector, target, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            
        elif pattern_type == "scatter":
            num_tgts = random.randint(3, 6)
            node_ids = [f"ACC_F_{(fraud_node_counter + j) % 100 + 1}" for j in range(num_tgts + 1)]
            fraud_node_counter += num_tgts + 1
            source = node_ids[0]
            targets = node_ids[1:]
            mot_txs, _ = generate_scatter(source, targets, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)
            
        elif pattern_type == "chain":
            chain_len = random.randint(3, 6)
            node_ids = [f"ACC_F_{(fraud_node_counter + j) % 100 + 1}" for j in range(chain_len)]
            fraud_node_counter += chain_len
            mot_txs, _ = generate_chain(node_ids, base_amt, start_time + timedelta(hours=random.randint(0, 100)))
            fraud_txs.extend(mot_txs)

    # Combine, sort
    all_txs = bg_txs + fraud_txs
    df = pd.DataFrame(all_txs)
    df["timestamp_parsed"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp_parsed").drop(columns=["timestamp_parsed"])
    
    # Save to Downloads
    out_path = os.path.join(downloads_dir, "aml_test_5k.csv")
    df.to_csv(out_path, index=False)
    print(f"Saved: {out_path}")
    print_stats(df)

# ---------------------------------------------------------------------------
# Statistics Helper
# ---------------------------------------------------------------------------

def print_stats(df):
    unique_nodes = set(df["source"]).union(set(df["target"]))
    num_fraud = df[df["IsLaundering"] == 1].shape[0]
    total = df.shape[0]
    pct_fraud = (num_fraud / total) * 100
    print(f"  Total Transactions: {total}")
    print(f"  Unique Nodes:       {len(unique_nodes)}")
    print(f"  Fraud Transactions: {num_fraud} ({pct_fraud:.2f}%)")
    print(f"  Columns:            {list(df.columns)}")
    print("-" * 50)

# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------

def main():
    downloads_dir = get_downloads_dir()
    os.makedirs(downloads_dir, exist_ok=True)
    print(f"Saving synthetic datasets directly to: {downloads_dir}\n" + "=" * 50)
    
    start_time = datetime(2026, 8, 1)
    
    generate_train_10k(downloads_dir, start_time)
    generate_test_200nodes_600tx(downloads_dir, start_time)
    generate_test_5k(downloads_dir, start_time)
    
    print("All synthetic datasets generated successfully!")

if __name__ == "__main__":
    main()
