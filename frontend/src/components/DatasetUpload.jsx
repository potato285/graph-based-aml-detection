import React, { useState, useRef } from 'react';
import * as api from '../services/api';

export default function DatasetUpload({ onUploadSuccess, onError }) {
  const [displayName, setDisplayName] = useState('');
  const [type, setType] = useState('train'); // default to 'train'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        onError('Invalid file format. Please drop a valid CSV file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      onError('Please select or drop a CSV file to upload.');
      return;
    }
    if (!displayName.trim()) {
      onError('Please enter a display name for the dataset.');
      return;
    }

    try {
      setUploading(true);
      await api.uploadDataset(file, displayName.trim(), type);
      
      // Reset form on success
      setDisplayName('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Callback to refresh registry
      onUploadSuccess('Dataset uploaded and registered successfully!');
    } catch (err) {
      onError(err.message || 'Failed to upload dataset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card-panel">
      <h3 className="card-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Register New Dataset
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Display Name</label>
          <input
            type="text"
            className="input-text"
            placeholder="e.g., AML Transaction Log v1"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={uploading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Dataset Split Type</label>
          <div className="type-selector">
            <div
              className={`type-option ${type === 'train' ? 'active' : ''}`}
              onClick={() => !uploading && setType('train')}
            >
              TRAIN SET
            </div>
            <div
              className={`type-option ${type === 'test' ? 'active' : ''}`}
              onClick={() => !uploading && setType('test')}
            >
              TEST SET
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Select Data (CSV)</label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />

          {!file ? (
            <div
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current.click()}
            >
              <div className="upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 12 15 15" />
                </svg>
              </div>
              <p className="upload-text-main">Click or Drag CSV file</p>
              <p className="upload-text-sub">Maximum file size: 50MB</p>
            </div>
          ) : (
            <div className="file-preview">
              <div className="file-details">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60a5fa' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="file-name" title={file.name}>{file.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={removeFile}
                disabled={uploading}
                title="Remove file"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={uploading || !file || !displayName.trim()}
        >
          {uploading ? (
            <>
              <span className="spinner"></span>
              Uploading CSV...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Register Dataset
            </>
          )}
        </button>
      </form>
    </div>
  );
}
