import React, { useState, useEffect } from 'react';
import { fetchConfig, updateConfig } from '../../api';
import { useVaultTheme } from '../../lib/vaultTheme';

export function ConfigPanel() {
  const { theme } = useVaultTheme();
  const [edit, setEdit] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchConfig()
      .then(cfg => {
        setEdit(JSON.stringify(cfg, null, 2));
      })
      .catch(e => setResult({ error: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const json = JSON.parse(edit);
      const res = await updateConfig(json);
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 rounded shadow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" style={{ borderColor: theme.accent }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: theme.accent }}>Config</h2>
      {loading && <div>Loading...</div>}
      <textarea
        className="w-full p-2 border rounded dark:bg-gray-900 dark:text-gray-100"
        rows={10}
        value={edit}
        onChange={e => setEdit(e.target.value)}
        disabled={loading}
      />
      <button
        className="px-4 py-2 rounded font-bold mt-2"
        style={{ background: theme.accent, color: theme.primary }}
        onClick={handleUpdate}
        disabled={loading}
      >
        Update Config
      </button>
      {result && (
        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
