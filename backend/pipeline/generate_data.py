import pandas as pd
import numpy as np
import networkx as nx
import random
import uuid
from datetime import datetime, timedelta

def generate_transactions(num_records=2000, is_test=False):
    # Base Network Configuration
    num_nodes = 1000
    m = 2 # number of edges to attach from a new node to existing nodes
    
    # Generate power-law distribution network using Barabasi-Albert model
    G = nx.barabasi_albert_graph(num_nodes, m)
    edges = list(G.edges())
    
    start_time = datetime(2024, 1, 1)
    
    def generate_amount():
        # Log-normal distribution for amount
        return round(np.random.lognormal(mean=4.0, sigma=1.0), 2)
    
    transactions = []
    
    # We aim to inject 15% fraud, so 300 records out of 2000.
    # We'll generate 1700 background transactions, and 300 fraud transactions.
    
    # 1. Background transactions (1700)
    for _ in range(1700):
        u, v = random.choice(edges)
        if random.random() < 0.5:
            u, v = v, u # random direction
        
        transactions.append({
            'tx_id': str(uuid.uuid4()),
            'sender_account': f"ACC_{u}",
            'receiver_account': f"ACC_{v}",
            'amount': generate_amount(),
            'is_fraud': 0
        })
        
    # 2. Fraud: Carousel Loops (A -> B -> C -> A)
    # Let's create 35 loops = 105 transactions
    for _ in range(35):
        nodes = random.sample(range(num_nodes), 3)
        loop_edges = [(nodes[0], nodes[1]), (nodes[1], nodes[2]), (nodes[2], nodes[0])]
        
        for u, v in loop_edges:
            transactions.append({
                'tx_id': str(uuid.uuid4()),
                'sender_account': f"ACC_{u}",
                'receiver_account': f"ACC_{v}",
                'amount': generate_amount(),
                'is_fraud': 1
            })
            
    # 3. Fraud: Smurf Rings (1 source -> 5 mules -> 1 target)
    # 1 source, 5 mules, 1 target = 10 transactions per ring.
    # Let's create 20 smurf rings = 200 transactions
    # Total fraud = 305 transactions. Total dataset = 2005. We'll truncate to 2000 later.
    for _ in range(20):
        special_nodes = random.sample(range(num_nodes), 7)
        source = special_nodes[0]
        target = special_nodes[1]
        mules = special_nodes[2:7]
        
        # Fan-out to mules
        for mule in mules:
            transactions.append({
                'tx_id': str(uuid.uuid4()),
                'sender_account': f"ACC_{source}",
                'receiver_account': f"ACC_{mule}",
                'amount': generate_amount(),
                'is_fraud': 1
            })
        
        # Fan-in to target
        for mule in mules:
            transactions.append({
                'tx_id': str(uuid.uuid4()),
                'sender_account': f"ACC_{mule}",
                'receiver_account': f"ACC_{target}",
                'amount': generate_amount(),
                'is_fraud': 1
            })

    # Assign sequential timestamps over 30 days
    # To do this and mix fraud vs background naturally, we assign random seconds and sort
    for tx in transactions:
        random_seconds = random.randint(0, 30 * 24 * 3600)
        tx['time_obj'] = start_time + timedelta(seconds=random_seconds)
        
    # Sort by timestamp
    transactions.sort(key=lambda x: x['time_obj'])
    
    # Truncate to exact num_records
    transactions = transactions[:num_records]
    
    # Format timestamp and clean up
    for tx in transactions:
        tx['timestamp'] = tx['time_obj'].isoformat()
        del tx['time_obj']
        
    # If a node is involved in fraud, we could label the *node* but the prompt requested 
    # the 'is_fraud' column in the records. We assigned 1 for fraud motif txs.
    
    df = pd.DataFrame(transactions)
    # Reorder columns to match conventional structure
    cols = ['tx_id', 'sender_account', 'receiver_account', 'amount', 'timestamp', 'is_fraud']
    df = df[cols]
    
    if is_test:
        df = df.drop(columns=['is_fraud'])
        
    return df

if __name__ == "__main__":
    import os
    
    # Ensure directories exist
    os.makedirs("../data/raw_train", exist_ok=True)
    os.makedirs("../data/raw_test", exist_ok=True)
    
    train_df = generate_transactions(num_records=2000, is_test=False)
    train_df.to_csv('../data/raw_train/train_dataset.csv', index=False)
    print("train_dataset.csv generated with shape:", train_df.shape)
    
    test_df = generate_transactions(num_records=2000, is_test=True)
    test_df.to_csv('../data/raw_test/test_dataset.csv', index=False)
    print("test_dataset.csv generated with shape:", test_df.shape)
