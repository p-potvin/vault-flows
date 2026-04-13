import React, { useState } from 'react';
import { uploadToStorage } from '../../api';
import { useVaultTheme } from '../../lib/vaultTheme';

export function StoragePanel() {
  const { theme } = useVaultTheme();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await uploadToStorage(file);
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 rounded shadow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" style={{ borderColor: theme.accent }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: theme.accent }}>Storage Upload</h2>
      <input
        type="file"
        className="mb-2"
        onChange={e => setFile(e.target.files[0])}
      />
      <button
        className="px-4 py-2 rounded font-bold"
        style={{ background: theme.accent, color: theme.primary }}
        onClick={handleUpload}
        disabled={loading || !file}
      >
        Upload
      </button>
      {result && (
        <pre className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
