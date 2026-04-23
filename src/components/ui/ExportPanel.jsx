import React, { useState } from 'react';
import { exportWorkflows } from '../../api';
import { useVaultTheme } from '../../lib/vaultTheme';

export const ExportPanel = React.memo(function ExportPanel() {
  const { theme } = useVaultTheme();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await exportWorkflows();
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 rounded shadow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" style={{ borderColor: theme.accent }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: theme.accent }}>Export Workflows</h2>
      <button
        className="px-4 py-2 rounded font-bold"
        style={{ background: theme.accent, color: theme.primary }}
        onClick={handleExport}
        disabled={loading}
      >
        Export Workflows
      </button>
      {result && (
        <pre className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
});
