/**
 * API Service for Graph-Based AML Detection Pipeline.
 * Connects React frontend components to FastAPI backend.
 */

const API_BASE_URL = '';

/**
 * Helper to process and handle HTTP responses safely.
 * Throws clean error messages parsed from the server.
 */
async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.detail) {
        errorMessage = data.detail;
      }
    } catch (e) {
      // JSON parsing failed, fallback to statusText
      if (response.statusText) {
        errorMessage = response.statusText;
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Helper to wrap any promise-based request with loading state tracking.
 * Useful for binding frontend spinner/loading indicators dynamically.
 * 
 * @param {Function} apiCallFn - Function returning a promise
 * @param {Function} setLoading - State setter function (e.g., React useState dispatch)
 */
export async function withLoadingState(apiCallFn, setLoading) {
  if (typeof setLoading === 'function') setLoading(true);
  try {
    return await apiCallFn();
  } finally {
    if (typeof setLoading === 'function') setLoading(false);
  }
}

/**
 * 1. Data Control Center (Dataset Lifecycle)
 */

/**
 * Fetches the complete list of registered datasets.
 * Triggers: GET /api/datasets
 */
export async function fetchRegistry() {
  const url = `${API_BASE_URL}/api/datasets`;
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Uploads a raw transactions CSV file and registers it in the system.
 * Triggers: POST /api/datasets/upload (using multipart/form-data)
 * 
 * @param {File} file - CSV File object from input
 * @param {string} displayName - Reader-friendly dataset name
 * @param {string} type - Dataset purpose: 'train' or 'test'
 */
export async function uploadDataset(file, displayName, type) {
  const url = `${API_BASE_URL}/api/datasets/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('displayName', displayName);
  formData.append('type', type);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(response);
}

/**
 * Purges a dataset and all associated files from disk and registry.
 * Triggers: DELETE /api/datasets/{id}
 * 
 * @param {string} id - 8-character dataset UUID
 */
export async function deleteDataset(id) {
  const url = `${API_BASE_URL}/api/datasets/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });
  return handleResponse(response);
}

/**
 * Initiates training on the specified training dataset.
 * Triggers: POST /api/datasets/{id}/train
 * 
 * @param {string} id - 8-character training dataset UUID
 */
export async function startTraining(id) {
  const url = `${API_BASE_URL}/api/datasets/${encodeURIComponent(id)}/train`;
  const response = await fetch(url, {
    method: 'POST',
  });
  return handleResponse(response);
}

/**
 * Initiates inference on the specified test dataset.
 * Triggers: POST /api/datasets/{id}/infer
 * 
 * @param {string} id - 8-character test dataset UUID
 * @param {string} [trainDatasetId] - Optional trained model ID to use for inference
 */
export async function startInference(id, trainDatasetId = null) {
  const url = `${API_BASE_URL}/api/datasets/${encodeURIComponent(id)}/infer`;
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (trainDatasetId) {
    options.body = JSON.stringify({ train_dataset_id: trainDatasetId });
  }

  const response = await fetch(url, options);
  return handleResponse(response);
}

/**
 * 2. Analytics & Visualizer Fetching
 */

/**
 * Fetches GNN model training history and final evaluation metrics.
 * Triggers: GET /static/metrics/{id}_metrics.json
 * 
 * @param {string} id - 8-character training dataset UUID
 */
export async function fetchModelMetrics(id) {
  const url = `${API_BASE_URL}/static/metrics/${encodeURIComponent(id)}_metrics.json`;
  const response = await fetch(url);
  return handleResponse(response);
}

/**
 * Fetches GNN inference output nodes, links, and risk scores.
 * Triggers: GET /static/graphs/{id}_results.json
 * 
 * @param {string} id - 8-character test dataset UUID
 */
export async function fetchGraphData(id) {
  const url = `${API_BASE_URL}/static/graphs/${encodeURIComponent(id)}_results.json`;
  const response = await fetch(url);
  return handleResponse(response);
}
