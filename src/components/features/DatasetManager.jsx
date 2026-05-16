// DatasetManager.jsx
// Placeholder for dataset manager UI

import React, { useState, useMemo } from 'react';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ⚡ Bolt: Wrap DatasetManager in React.memo() to prevent unnecessary re-renders
export const DatasetManager = React.memo(function DatasetManager() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setError(null);
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 10MB limit.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Simulate secure upload processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('File successfully validated and processed for dataset.');
      setFile(null);
      if (e.target) e.target.reset();
    } catch (err) {
      // Secure error handling - do not leak internals
      console.error('Upload operation failed', err);
      setError('An error occurred during file upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const isDisabled = useMemo(() => isUploading || !file, [isUploading, file]);

  return (
    <div className="p-4 border rounded-md shadow-sm bg-white">
      <h2 className="text-xl font-bold mb-4">Dataset Manager</h2>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label htmlFor="dataset-upload" className="block text-sm font-medium text-gray-700 mb-1">
            Upload Image to Dataset
          </label>
          <input
            id="dataset-upload"
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleFileChange}
            required
            aria-required="true"
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-vault-50 file:text-vault-700
              hover:file:bg-vault-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isDisabled}
          className="px-4 py-2 bg-vault-600 text-white rounded-md hover:bg-vault-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          title={isDisabled && !isUploading ? 'Select a valid file first' : undefined}
        >
          {isUploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </form>
    </div>
  );
});
