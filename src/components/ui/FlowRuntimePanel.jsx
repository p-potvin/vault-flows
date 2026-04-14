import React, { useEffect, useMemo, useState } from 'react';
import { fetchConfig, scanLocalModels, updateConfig } from '../../api';
import {
  FLOW_MODEL_SLOTS,
  getFlowSelection,
  summarizeModelCatalog,
} from '../../lib/flowRuntime';

function toneClass(type) {
  if (type === 'error') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200';
  }

  if (type === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200';
  }

  return 'border-vault-200 bg-vault-50 text-vault-900 dark:border-vault-700 dark:bg-vault-950/40 dark:text-vault-100';
}

function prettyProviderLabel(provider) {
  switch (provider) {
    case 'local-bridge':
      return 'Local bridge';
    case 'local-comfyui':
      return 'Local ComfyUI';
    case 'remote-api':
      return 'Remote API';
    default:
      return 'Browser local';
  }
}

export function FlowRuntimePanel({ flowId, title, description, onConfigChange }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState(null);

  const slots = FLOW_MODEL_SLOTS[flowId] || [];
  const selection = useMemo(
    () => (config ? getFlowSelection(config, flowId) : {}),
    [config, flowId],
  );
  const catalogSummary = useMemo(
    () => (config ? summarizeModelCatalog(config.scannedModels) : []),
    [config],
  );

  useEffect(() => {
    let active = true;

    fetchConfig()
      .then((loaded) => {
        if (!active) {
          return;
        }

        setConfig(loaded);
        onConfigChange?.(loaded);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setMessage({
          type: 'error',
          text: error.message,
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [flowId, onConfigChange]);

  async function handleRefresh() {
    setRefreshing(true);
    setMessage(null);

    try {
      const scannedModels = await scanLocalModels();
      const nextConfig = await fetchConfig();
      setConfig(nextConfig);
      onConfigChange?.(nextConfig);
      setMessage({
        type: scannedModels.warnings?.length ? 'warning' : 'info',
        text: scannedModels.warnings?.length
          ? scannedModels.warnings.join(' ')
          : 'Model catalog refreshed.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Could not refresh the local model catalog.',
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSelect(slotKey, value) {
    if (!config) {
      return;
    }

    const nextSelections = {
      ...config.flowModelSelections,
      [flowId]: {
        ...selection,
        [slotKey]: value,
      },
    };

    const updated = await updateConfig({
      flowModelSelections: nextSelections,
    });

    setConfig(updated);
    onConfigChange?.(updated);
  }

  if (loading) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
        Loading local runtime settings...
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/30">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title || 'Local Runtime'}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {description || 'This flow reads the shared runtime config so future flows can reuse the same local model catalog.'}
          </p>
        </div>
        <div className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
          Provider: {prettyProviderLabel(config?.runtimeProvider)}
        </div>
      </div>

      <div className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        Model folder: {config?.modelsDir || 'Not configured'}{config?.scannedModels?.scannedAt ? ` • Last scan ${new Date(config.scannedModels.scannedAt).toLocaleString()}` : ''}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-vault-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-vault-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vault-100 dark:text-vault-900 dark:hover:bg-vault-200"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Model Catalog'}
        </button>
      </div>

      {catalogSummary.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
          {catalogSummary.map((group) => (
            <span key={group.key} className="rounded border border-gray-200 px-2 py-1 dark:border-gray-700">
              {group.label}: {group.count}
            </span>
          ))}
        </div>
      )}

      {message && (
        <div className={`mb-4 rounded border px-3 py-2 text-sm ${toneClass(message.type)}`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {slots.map((slot) => {
          const options = config?.scannedModels?.categories?.[slot.group] || [];

          return (
            <label key={slot.key} className="block">
              <span className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-100">
                {slot.label}
              </span>
              <select
                value={selection[slot.key] || ''}
                onChange={(event) => handleSelect(slot.key, event.target.value)}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="">
                  {slot.optional ? 'None selected' : slot.placeholder}
                </option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.relativePath}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {options.length
                  ? `${options.length} local models available in this group.`
                  : 'No scanned models available for this group yet.'}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
