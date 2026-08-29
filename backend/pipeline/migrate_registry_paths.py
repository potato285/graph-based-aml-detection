"""
One-shot migration script.
Run from ANY working directory:
    python3 backend/pipeline/migrate_registry_paths.py
"""
import os
import shutil
import json

# Anchor to this file's location to find the repo root reliably
_HERE      = os.path.dirname(os.path.abspath(__file__))     # backend/pipeline/
REPO_ROOT  = os.path.abspath(os.path.join(_HERE, "..", ".."))
PROCESSED  = os.path.join(REPO_ROOT, "backend", "data", "processed")
REGISTRY_P = os.path.join(REPO_ROOT, "backend", "data", "registry.json")


def migrate():
    print(f"REPO_ROOT  = {REPO_ROOT}")
    print(f"REGISTRY   = {REGISTRY_P}\n")

    with open(REGISTRY_P) as f:
        reg = json.load(f)

    # Ensure type-specific sub-directories exist
    for sub in ("train", "test"):
        os.makedirs(os.path.join(PROCESSED, sub), exist_ok=True)

    for dataset_id, entry in reg["datasets"].items():
        old_stored = entry["paths"].get("tensor", "")
        if not old_stored:
            print(f"  [{dataset_id}] No tensor path — skip")
            continue

        # Resolve stored value (may be absolute or relative) → absolute
        old_abs = old_stored if os.path.isabs(old_stored) \
                  else os.path.join(REPO_ROOT, old_stored)

        dataset_type  = entry["type"]          # "train" or "test"
        new_abs       = os.path.join(PROCESSED, dataset_type, f"{dataset_id}.pt")

        if old_abs != new_abs:
            if os.path.exists(old_abs):
                os.makedirs(os.path.dirname(new_abs), exist_ok=True)
                shutil.move(old_abs, new_abs)
                print(f"  [{dataset_id}] Moved  {os.path.relpath(old_abs, REPO_ROOT)}")
                print(f"            →  {os.path.relpath(new_abs, REPO_ROOT)}")
            else:
                print(f"  [{dataset_id}] Source missing: {old_abs}")

        # Update tensor path to new relative location
        entry["paths"]["tensor"] = os.path.relpath(new_abs, REPO_ROOT)

        # Normalise every path value in this entry to repo-relative
        for key, val in list(entry["paths"].items()):
            if val and os.path.isabs(val):
                entry["paths"][key] = os.path.relpath(val, REPO_ROOT)

    # Persist updated registry
    with open(REGISTRY_P, "w") as f:
        json.dump(reg, f, indent=4)
    print("\nregistry.json updated with relative paths ✓")

    # Remove orphaned flat tensors
    for orphan in ("train_tensor.pt", "test_tensor.pt"):
        p = os.path.join(PROCESSED, orphan)
        if os.path.exists(p):
            os.remove(p)
            print(f"  Deleted orphan: {orphan}")

    # Final layout report
    print("\nFinal layout of backend/data/processed/:")
    for root, _, files in os.walk(PROCESSED):
        for fname in sorted(files):
            full = os.path.join(root, fname)
            print(f"  {os.path.relpath(full, REPO_ROOT)}")

    print("\nFinal registry.json:")
    with open(REGISTRY_P) as f:
        print(f.read())


if __name__ == "__main__":
    migrate()
