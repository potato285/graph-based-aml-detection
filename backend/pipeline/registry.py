import json
import os
import uuid
import portalocker
import contextlib
import shutil

# ---------------------------------------------------------------------------
# Path constants (anchored to this file's location, independent of CWD)
# ---------------------------------------------------------------------------
_PIPELINE_DIR = os.path.dirname(os.path.abspath(__file__))
# repo root is two levels up from backend/pipeline/
REPO_ROOT      = os.path.abspath(os.path.join(_PIPELINE_DIR, "..", ".."))
REGISTRY_PATH  = os.path.join(_PIPELINE_DIR, "..", "data", "registry.json")

# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def rel_path(abs_path: str) -> str:
    """
    Convert an absolute path to a path relative to the repository root.
    All paths stored in registry.json go through this function so the file
    never contains machine-specific absolute paths.
    """
    return os.path.relpath(os.path.abspath(abs_path), REPO_ROOT)


def resolve_path(rel_or_abs: str) -> str:
    """
    Given a path from the registry (which may be relative or absolute),
    return an absolute path suitable for file I/O.
    """
    if os.path.isabs(rel_or_abs):
        return rel_or_abs
    return os.path.join(REPO_ROOT, rel_or_abs)


# ---------------------------------------------------------------------------
# Registry I/O
# ---------------------------------------------------------------------------

@contextlib.contextmanager
def atomic_registry():
    """Context manager for atomic read-modify-write on the registry."""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    lock_path = REGISTRY_PATH + ".lock"
    with portalocker.Lock(lock_path, 'w', timeout=10):
        if not os.path.exists(REGISTRY_PATH):
            with open(REGISTRY_PATH, "w") as f:
                json.dump({"datasets": {}}, f, indent=4)
        with open(REGISTRY_PATH, "r") as f:
            data = json.load(f)
        
        yield data
        
        with open(REGISTRY_PATH, "w") as f:
            json.dump(data, f, indent=4)

def load_registry() -> dict:
    """Load the registry from disk safely."""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    lock_path = REGISTRY_PATH + ".lock"
    with portalocker.Lock(lock_path, 'w', timeout=10):
        if not os.path.exists(REGISTRY_PATH):
            with open(REGISTRY_PATH, "w") as f:
                json.dump({"datasets": {}}, f, indent=4)
        with open(REGISTRY_PATH, "r") as f:
            return json.load(f)

def save_registry(data: dict) -> None:
    """Persist the registry dict to disk safely."""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    lock_path = REGISTRY_PATH + ".lock"
    with portalocker.Lock(lock_path, 'w', timeout=10):
        with open(REGISTRY_PATH, "w") as f:
            json.dump(data, f, indent=4)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def register_dataset(display_name: str, dataset_type: str, raw_csv_path: str) -> str:
    """
    Register a new dataset and return its 8-character UUID.
    `raw_csv_path` may be absolute or relative; it is normalised to relative
    before being stored.
    """
    dataset_id = uuid.uuid4().hex[:8]

    with atomic_registry() as registry:
        registry["datasets"][dataset_id] = {
            "display_name": display_name,
            "type": dataset_type,
            "status": "raw",
            "paths": {
                "raw_csv": rel_path(raw_csv_path) if raw_csv_path else ""
            },
        }

    return dataset_id


def update_dataset_status(dataset_id: str, new_status: str, new_paths_dict: dict) -> None:
    """
    Update the lifecycle status and merge new path entries for a dataset.
    All path values in `new_paths_dict` are normalised to relative paths
    before being stored so registry.json stays portable.
    """
    with atomic_registry() as registry:
        if dataset_id not in registry["datasets"]:
            raise ValueError(f"Dataset '{dataset_id}' not found in registry.")

        dataset = registry["datasets"][dataset_id]
        dataset["status"] = new_status

        for key, value in new_paths_dict.items():
            # Normalise: store relative paths only
            dataset["paths"][key] = rel_path(value) if value else ""


def get_dataset(dataset_id: str) -> dict:
    """Return the registry entry for a specific dataset (raw dict, paths still relative)."""
    registry = load_registry()
    if dataset_id not in registry["datasets"]:
        raise ValueError(f"Dataset '{dataset_id}' not found in registry.")
    return registry["datasets"][dataset_id]


def get_all_datasets() -> dict:
    """Return the full datasets dict keyed by UUID."""
    return load_registry()["datasets"]


def delete_dataset(dataset_id: str) -> None:
    """
    Delete a dataset from the registry and remove its associated files.
    """
    with atomic_registry() as registry:
        if dataset_id not in registry["datasets"]:
            raise ValueError(f"Dataset '{dataset_id}' not found in registry.")
        
        dataset = registry["datasets"][dataset_id]
        
        # Delete files safely
        for key, rel_p in dataset["paths"].items():
            if not rel_p: continue
            abs_p = resolve_path(rel_p)
            if os.path.exists(abs_p):
                try:
                    os.remove(abs_p)
                except Exception as e:
                    print(f"Warning: failed to remove file {abs_p}: {e}")
                    
        # Remove from registry
        del registry["datasets"][dataset_id]
