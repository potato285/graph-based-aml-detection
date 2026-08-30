#!/usr/bin/env python3
"""
FastAPI Server for Graph-Based AML Detection Pipeline.
"""

import os
import sys
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Ensure repository root is on sys.path
_MAIN_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(_MAIN_DIR, ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from backend.pipeline import registry, build_graph, engine

app = FastAPI(
    title="Graph-Based AML Detection API",
    description="Backend orchestration API for the Graph-Based AML Pipeline using FastAPI and PyTorch Geometric.",
    version="1.0.0"
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve Static Exported Files (metrics and graph results)
static_dir = os.path.join(REPO_ROOT, "backend", "data", "exports")
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "metrics"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "graphs"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/api/datasets")
def get_datasets():
    """Reads registry.json and returns all registered datasets."""
    try:
        datasets = registry.get_all_datasets()
        return datasets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch registry: {str(e)}")


@app.post("/api/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    displayName: str = Form(...),
    type: str = Form(...)  # expected "train" or "test"
):
    """
    Uploads a dataset CSV file, registers it, and saves it in raw directories.
    """
    if type not in ["train", "test"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid dataset type '{type}'. Must be 'train' or 'test'."
        )

    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Only CSV files are allowed."
        )

    try:
        # 1. Register dataset in registry (returns unique dataset_id)
        dataset_id = registry.register_dataset(displayName, type, "")

        # 2. Determine target directories and path
        target_dir_name = "raw_train" if type == "train" else "raw_test"
        target_dir = os.path.join(REPO_ROOT, "backend", "data", target_dir_name)
        os.makedirs(target_dir, exist_ok=True)
        raw_csv_path = os.path.join(target_dir, f"{dataset_id}.csv")

        # 3. Save uploaded file contents
        with open(raw_csv_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 4. Update registry status and paths
        registry.update_dataset_status(dataset_id, "raw", {"raw_csv": raw_csv_path})

        # Return registered info
        return {
            "dataset_id": dataset_id,
            "display_name": displayName,
            "type": type,
            "status": "raw",
            "paths": {
                "raw_csv": registry.rel_path(raw_csv_path)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Dataset registration and upload failed: {str(e)}"
        )


@app.delete("/api/datasets/{id}")
def delete_dataset(id: str):
    """Purges all files associated with a dataset and removes it from the registry."""
    try:
        # Check if dataset exists first to return proper error
        try:
            registry.get_dataset(id)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Dataset '{id}' not found.")

        registry.delete_dataset(id)
        return {"message": f"Dataset '{id}' deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete dataset '{id}': {str(e)}")


@app.post("/api/datasets/{id}/train")
def train_dataset(id: str):
    """
    Builds the graph tensor and trains the model on the dataset.
    """
    try:
        # 1. Validate dataset existence and type
        try:
            dataset_info = registry.get_dataset(id)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Dataset '{id}' not found.")

        if dataset_info["type"] != "train":
            raise HTTPException(
                status_code=400,
                detail=f"Dataset '{id}' is type '{dataset_info['type']}', but training requires 'train' type."
            )

        # 2. Build graph tensor
        print(f"[API] Converting CSV to tensor for {id}")
        build_graph.convert_csv_to_tensor(id)

        # 3. Process/Train graph GNN
        print(f"[API] Training GNN model for {id}")
        engine.process_graph(id)

        # Get latest dataset status to return
        updated_info = registry.get_dataset(id)
        return {
            "dataset_id": id,
            "status": updated_info["status"],
            "paths": updated_info["paths"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Training pipeline execution failed for '{id}': {str(e)}"
        )


class InferRequest(BaseModel):
    train_dataset_id: str = None


@app.post("/api/datasets/{id}/infer")
def infer_dataset(id: str, request: InferRequest = None):
    """
    Builds the graph tensor and runs GNN inference on the test dataset.
    """
    train_dataset_id = request.train_dataset_id if request else None
    try:
        # 1. Validate dataset existence and type
        try:
            dataset_info = registry.get_dataset(id)
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Dataset '{id}' not found.")

        if dataset_info["type"] != "test":
            raise HTTPException(
                status_code=400,
                detail=f"Dataset '{id}' is type '{dataset_info['type']}', but inference requires 'test' type."
            )

        # 2. Build graph tensor
        print(f"[API] Converting CSV to tensor for test set {id}")
        build_graph.convert_csv_to_tensor(id)

        # 3. Process graph inference
        print(f"[API] Running inference for test set {id} using train model {train_dataset_id}")
        engine.process_graph(id, train_dataset_id=train_dataset_id)

        # Get latest dataset status to return
        updated_info = registry.get_dataset(id)
        return {
            "dataset_id": id,
            "status": updated_info["status"],
            "paths": updated_info["paths"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference pipeline execution failed for '{id}': {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
