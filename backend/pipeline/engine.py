import torch
import torch.nn as nn
import json
import os
import registry
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from model import FraudGATv2

def train_model(data, model_save_path, dataset_id):
    print("--- Training Model ---")
    model = FraudGATv2(in_channels=5, hidden_channels=16, heads=4, out_channels=1)
    
    # Calculate pos_weight for class imbalance
    y = data.y
    num_safe = (y == 0).sum().item()
    num_fraud = (y == 1).sum().item()
    
    if num_fraud > 0:
        pos_weight = torch.tensor([num_safe / num_fraud], dtype=torch.float)
    else:
        pos_weight = torch.tensor([1.0], dtype=torch.float)
        
    print(f"Class distribution: Safe={num_safe}, Fraud={num_fraud}")
    print(f"pos_weight: {pos_weight.item():.2f}")
    
    # BCEWithLogitsLoss applies Sigmoid internally, perfect for raw logit output
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    
    model.train()
    history = []
    
    # Run 100 epochs
    for epoch in range(1, 101):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index).squeeze()
        loss = criterion(out, data.y)
        loss.backward()
        optimizer.step()
        
        history.append({"epoch": epoch, "loss": loss.item()})
        
        if epoch % 20 == 0:
            print(f"Epoch {epoch:03d}, Loss: {loss.item():.4f}")
            
    # Evaluation on the training set (to verify learning)
    model.eval()
    with torch.no_grad():
        out = model(data.x, data.edge_index).squeeze()
        probs = torch.sigmoid(out)
        preds = (probs > 0.5).float()
        
    y_true = data.y.numpy()
    y_pred = preds.numpy()
    
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    print("\nFinal Training Metrics:")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1-Score:  {f1:.4f}\n")
    
    metrics_dict = {
        "history": history,
        "metrics": {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1": float(f1)
        }
    }
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    metrics_save_path = os.path.join(BASE_DIR, '..', '..', 'frontend', 'public', 'metrics', f'{dataset_id}_metrics.json')
    os.makedirs(os.path.dirname(metrics_save_path), exist_ok=True)
    with open(metrics_save_path, 'w') as f:
        json.dump(metrics_dict, f, indent=2)
    print(f"Metrics saved to {metrics_save_path}")
    
    registry.update_dataset_status(dataset_id, "trained", {"metrics": metrics_save_path})
    
    # Save weights
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_save_path_abs = os.path.join(BASE_DIR, '..', 'data', 'models', 'gnn_weights.pt')
    os.makedirs(os.path.dirname(model_save_path_abs), exist_ok=True)
    torch.save(model.state_dict(), model_save_path_abs)
    print(f"Model weights saved to {model_save_path_abs}\n")

def run_inference(data, model_path, json_save_path, dataset_id):
    print("--- Running Inference ---")
    model = FraudGATv2(in_channels=5, hidden_channels=16, heads=4, out_channels=1)
    model.load_state_dict(torch.load(model_path, weights_only=True))
    model.eval()
    
    with torch.no_grad():
        out = model(data.x, data.edge_index).squeeze()
        # Apply Sigmoid to get probability between 0.0 and 1.0
        risk_scores = torch.sigmoid(out).numpy()
        
    nodes_list = []
    num_nodes = data.x.shape[0]
    
    for i in range(num_nodes):
        # Extract specific features to pass to frontend
        in_deg = float(data.x[i, 0].item())
        retention = float(data.x[i, 3].item())
        betti_1 = float(data.x[i, 4].item())
        risk_score = float(risk_scores[i])
        
        nodes_list.append({
            "id": i,
            "account_id": data.node_ids[i] if hasattr(data, 'node_ids') else f"node_{i}",
            "in_degree": in_deg,
            "retention": retention,
            "betti_1": betti_1,
            "risk_score": risk_score
        })
        
    links_list = []
    edge_index = data.edge_index
    num_edges = edge_index.shape[1]
    
    for i in range(num_edges):
        source = int(edge_index[0, i].item())
        target = int(edge_index[1, i].item())
        links_list.append({
            "source": source,
            "target": target
        })
        
    graph_dict = {
        "nodes": nodes_list,
        "links": links_list
    }
    
    os.makedirs(os.path.dirname(json_save_path), exist_ok=True)
    with open(json_save_path, 'w') as f:
        json.dump(graph_dict, f, indent=2)
        
    print(f"Inference complete. JSON formatted graph saved to {json_save_path}\n")
    
    registry.update_dataset_status(dataset_id, "inferred", {"graph_results": json_save_path})

def process_graph(dataset_id):
    dataset_info = registry.get_dataset(dataset_id)
    tensor_path = dataset_info["paths"]["tensor"]
    dataset_type = dataset_info["type"]
    
    print(f"Loading {tensor_path} for dataset {dataset_id}...")
    data = torch.load(tensor_path, weights_only=False)
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_save_path = os.path.join(BASE_DIR, '..', 'data', 'models', 'gnn_weights.pt')
    
    if dataset_type == "train":
        train_model(data, model_save_path, dataset_id)
    else:
        json_save_path = os.path.join(BASE_DIR, '..', '..', 'frontend', 'public', 'graphs', f'{dataset_id}_results.json')
        run_inference(data, model_save_path, json_save_path, dataset_id)

if __name__ == "__main__":
    print("Please import and use process_graph(dataset_id) directly.")
