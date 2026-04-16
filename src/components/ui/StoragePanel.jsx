import React, { useEffect, useRef, useState } from 'react';
import * as api from '../../api';
import { useVaultTheme } from '../../lib/vaultTheme';

const STORAGE_HISTORY_KEY = 'vault-flows-storage-history';

function readUploadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUploadHistory(history) {
  localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function createHistoryEntry(file, mode, status, details = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'unknown',
    uploadedAt: new Date().toISOString(),
    mode,
    status,
    ...details,
  };
}

function getMessageTone(type) {
  if (type === 'error') {
    return 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
  }

  if (type === 'warning') {
    return 'text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
  }

  return 'text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
}

export function StoragePanel() {
  const { theme } = useVaultTheme();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setHistory(readUploadHistory());
  }, []);

  const handleUpload = async () => {
    if (!file || loading) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const runtime = api.getApiRuntime ? api.getApiRuntime() : { mode: 'local-fallback' };
    const usingRemote = runtime.mode === 'remote-with-local-fallback';

    try {
      let nextMessage;
      let historyEntry;

      if (typeof api.uploadToStorage === 'function') {
        const response = await api.uploadToStorage(file);
        
        if (usingRemote) {
          historyEntry = createHistoryEntry(file, 'api', 'uploaded', { response });
          nextMessage = {
            type: 'success',
            title: 'Upload completed',
            description: `${file.name} was uploaded via the real API contract.`,
            details: response,
          };
        } else {
          historyEntry = createHistoryEntry(file, 'local', 'queued', { response, note: 'Demo mode metadata' });
          nextMessage = {
            type: 'warning',
            title: 'Saved local metadata only',
            description: `${file.name} metadata was recorded in localStorage demo mode. Establish API connection to truly upload.`,
            details: historyEntry,
          };
        }
      } else {
        historyEntry = createHistoryEntry(file, 'local', 'queued', {
          note: 'Upload API is completely missing. File contents are not persisted locally.',
        });
        nextMessage = {
          type: 'warning',
          title: 'Saved locally only',
          description: `${file.name} was added to the local upload queue.`,
          details: historyEntry,
        };
      }

      const nextHistory = [historyEntry, ...readUploadHistory()].slice(0, 10);
      writeUploadHistory(nextHistory);
      setHistory(nextHistory);
      setMessage(nextMessage);
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      const fallbackEntry = createHistoryEntry(file, 'local-fallback', 'queued', {
        note: error.message,
      });
      const nextHistory = [fallbackEntry, ...readUploadHistory()].slice(0, 10);

      writeUploadHistory(nextHistory);
      setHistory(nextHistory);
      setMessage({
        type: 'warning',
        title: 'Upload API failed',
        description: `${file.name} was recorded locally because the API upload failed.`,
        details: {
          error: error.message,
          fallback: fallbackEntry,
        },
      });
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-4 rounded shadow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
      style={{ borderColor: theme.accent }}
    >
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-xl font-bold" style={{ color: theme.accent }}>Storage Upload</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Upload a file when the storage API is available. If it is not, the panel keeps a local queue entry so the UI remains usable.
        </p>
      </div>

      <div className="rounded border border-dashed border-gray-300 dark:border-gray-700 p-4 bg-gray-50/70 dark:bg-gray-800/40">
        <input
          ref={inputRef}
          type="file"
          className="block w-full text-sm mb-3 text-gray-700 dark:text-gray-200 file:mr-4 file:rounded file:border-0 file:px-3 file:py-2 file:font-semibold file:cursor-pointer"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setMessage(null);
          }}
          disabled={loading}
        />

        {file ? (
          <div className="mb-3 rounded border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
            <div className="font-semibold text-gray-900 dark:text-gray-100">{file.name}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)}{file.type ? ` • ${file.type}` : ''}
            </div>
          </div>
        ) : (
          <div className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            No file selected yet.
          </div>
        )}

        <button
          className="px-4 py-2 rounded font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: theme.accent, color: theme.primary }}
          onClick={handleUpload}
          disabled={loading || !file}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {message && (
        <div className={`mt-4 rounded border p-3 ${getMessageTone(message.type)}`}>
          <div className="font-semibold">{message.title}</div>
          <div className="text-sm mt-1">{message.description}</div>
          {message.details && (
            <pre className="mt-3 p-2 rounded text-xs overflow-x-auto bg-white/60 dark:bg-black/20">
              {JSON.stringify(message.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent upload activity</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Local history</span>
        </div>

        {history.length === 0 ? (
          <div className="rounded border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-500 dark:text-gray-400">
            No uploads recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{entry.fileName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(entry.fileSize)} • {entry.mode} • {entry.status}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(entry.uploadedAt).toLocaleString()}
                  </div>
                </div>
                {(entry.note || entry.response) && (
                  <pre className="mt-2 p-2 rounded text-xs overflow-x-auto bg-white dark:bg-gray-900">
                    {JSON.stringify(entry.note ? { note: entry.note } : entry.response, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
