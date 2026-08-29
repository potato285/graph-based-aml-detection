import json
import os
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REGISTRY_PATH = os.path.join(BASE_DIR, '..', 'data', 'registry.json')

def load_registry():
    """Load the registry from disk, creating it if it doesn't exist."""
    if not os.path.exists(REGISTRY_PATH):
        os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
        save_registry({"datasets": {}})
    
    with open(REGISTRY_PATH, 'r') as f:
        return json.load(f)

def save_registry(data):
    """Save the registry to disk."""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, 'w') as f:
        json.dump(data, f, indent=4)

def register_dataset(display_name, dataset_type, raw_csv_path):
    """
    Registers a new dataset, returning its UUID.
    """
    registry = load_registry()
    dataset_id = uuid.uuid4().hex[:8]
    
    registry["datasets"][dataset_id] = {
        "display_name": display_name,
        "type": dataset_type,
        "status": "raw",
        "paths": {
            "raw_csv": raw_csv_path
        }
    }
    
    save_registry(registry)
    return dataset_id

def update_dataset_status(dataset_id, new_status, new_paths_dict):
    """
    Updates the status and merges new file paths into the dataset's entry.
    """
    registry = load_registry()
    
    if dataset_id not in registry["datasets"]:
        raise ValueError(f"Dataset {dataset_id} not found in registry.")
        
    dataset = registry["datasets"][dataset_id]
    dataset["status"] = new_status
    
    # Merge new paths
    for key, value in new_paths_dict.items():
        dataset["paths"][key] = value
        
    save_registry(registry)

def get_dataset(dataset_id):
    """
    Returns the dictionary for a specific dataset.
    """
    registry = load_registry()
    if dataset_id not in registry["datasets"]:
        raise ValueError(f"Dataset {dataset_id} not found in registry.")
        
    return registry["datasets"][dataset_id]
