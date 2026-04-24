import React, { useState } from 'react';
import { backupWorkflows, restoreWorkflows } from '../../api';
import { useVaultTheme } from '../../lib/vaultTheme';

export const BackupRestorePanel = React.memo(function BackupRestorePanel() {
  const { theme } = useVaultTheme();
  const [backupResult, setBackupResult] = useState(null);
  const [restoreData, setRestoreData] = useState('');
  const [restoreResult, setRestoreResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    setBackupResult(null);
    try {
      const result = await backupWorkflows();
      setBackupResult(result);
    } catch (e) {
      setBackupResult({ error: e.message });
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    setLoading(true);
    setRestoreResult(null);
    try {
      const json = JSON.parse(restoreData);
      const result = await restoreWorkflows(json);
      setRestoreResult(result);
    } catch (e) {
      setRestoreResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 rounded shadow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" style={{ borderColor: theme.accent }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: theme.accent }}>Backup & Restore Workflows</h2>
      <button
        className="px-4 py-2 rounded font-bold mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: theme.accent, color: theme.primary }}
        onClick={handleBackup}
        disabled={loading}
      >
        {loading ? 'Backing up...' : 'Backup Workflows'}
      </button>
      {backupResult && (
        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{JSON.stringify(backupResult, null, 2)}</pre>
      )}
      <div className="mt-6">
        <label htmlFor="restore-data" className="block mb-2 font-semibold">Restore Data (JSON):</label>
        <textarea
          id="restore-data"
          className="w-full p-2 border rounded dark:bg-gray-900 dark:text-gray-100"
          rows={5}
          value={restoreData}
          onChange={e => setRestoreData(e.target.value)}
        />
        <button
          className="px-4 py-2 rounded font-bold mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: theme.accent, color: theme.primary }}
          onClick={handleRestore}
          disabled={loading}
        >
          {loading ? 'Restoring...' : 'Restore Workflows'}
        </button>
        {restoreResult && (
          <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">{JSON.stringify(restoreResult, null, 2)}</pre>
        )}
      </div>
    </div>
  );
});
