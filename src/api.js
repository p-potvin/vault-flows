// Simple API client for workflow backend
const API_BASE = import.meta.env.VITE_API_URL || ''

export async function fetchWorkflows() {
  const res = await fetch(`${API_BASE}/workflows`);
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

export async function createWorkflow({ name, category }) {
  const res = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category })
  });
  if (!res.ok) throw new Error('Failed to create workflow');
  return res.json();
}
// Add more API methods as needed (update, delete, etc.)

// Update Workflow
export async function updateWorkflow(id, data) {
  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update workflow');
  return res.json();
}

// Delete Workflow
export async function deleteWorkflow(id) {
  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete workflow');
  return res.json();
}

// Export Workflows
export async function exportWorkflows(ids) {
  const res = await fetch(`${API_BASE}/workflows/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Failed to export workflows');
  return res.json();
}

// Backup Workflows
export async function backupWorkflows() {
  const res = await fetch(`${API_BASE}/workflows/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to backup workflows');
  return res.json();
}

// Restore Workflows
export async function restoreWorkflows(data) {
  const res = await fetch(`${API_BASE}/workflows/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error('Failed to restore workflows');
  return res.json();
}

// Pin Workflow
export async function pinWorkflow(id, pin) {
  const res = await fetch(`${API_BASE}/workflows/pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, pin }),
  });
  if (!res.ok) throw new Error('Failed to pin workflow');
  return res.json();
}

// Favorite Workflow
export async function favoriteWorkflow(id, favorite) {
  const res = await fetch(`${API_BASE}/workflows/favorite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, favorite }),
  });
  if (!res.ok) throw new Error('Failed to favorite workflow');
  return res.json();
}

// Run Workflow
export async function runWorkflow(id, mode) {
  const res = await fetch(`${API_BASE}/workflows/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, mode }),
  });
  if (!res.ok) throw new Error('Failed to run workflow');
  return res.json();
}

// Storage Uploads
export async function uploadGoogleDrive(data) {
  const res = await fetch(`${API_BASE}/storage/google-drive/upload`, {
    method: 'POST',
    body: data,
  });
  if (!res.ok) throw new Error('Failed to upload to Google Drive');
  return res.json();
}

export async function uploadDropbox(data) {
  const res = await fetch(`${API_BASE}/storage/dropbox/upload`, {
    method: 'POST',
    body: data,
  });
  if (!res.ok) throw new Error('Failed to upload to Dropbox');
  return res.json();
}

export async function uploadIcloud(data) {
  const res = await fetch(`${API_BASE}/storage/icloud/upload`, {
    method: 'POST',
    body: data,
  });
  if (!res.ok) throw new Error('Failed to upload to iCloud');
  return res.json();
}

export async function uploadOther(data) {
  const res = await fetch(`${API_BASE}/storage/other/upload`, {
    method: 'POST',
    body: data,
  });
  if (!res.ok) throw new Error('Failed to upload to Other storage');
  return res.json();
}

// Config: Models Dir
export async function getModelsDir() {
  const res = await fetch(`${API_BASE}/config/models-dir`);
  if (!res.ok) throw new Error('Failed to get models dir');
  return res.json();
}

export async function setModelsDir(dir_path) {
  const res = await fetch(`${API_BASE}/config/models-dir?dir_path=${encodeURIComponent(dir_path)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to set models dir');
  return res.json();
}
