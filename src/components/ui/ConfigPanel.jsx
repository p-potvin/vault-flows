import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../api';
import { useVaultTheme } from '../../lib/vaultTheme';
import { summarizeModelCatalog } from '../../lib/flowRuntime';

const CONFIG_STORAGE_KEY = 'vault-flows-config-panel';

function getLocalConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalConfig(config) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config, null, 2));
}

function normalizeConfigPayload(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    if (payload.config && typeof payload.config === 'object' && !Array.isArray(payload.config)) {
      return payload.config;
    }

    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
      if (payload.data.config && typeof payload.data.config === 'object' && !Array.isArray(payload.data.config)) {
        return payload.data.config;
      }

      return payload.data;
    }

    return payload;
  }

  return {};
}

function formatConfig(config) {
  return JSON.stringify(config, null, 2);
}

function getBannerTone(type) {
  if (type === 'error') {
    return 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800';
  }

  if (type === 'warning') {
    return 'text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
  }

  return 'text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
}

function pickRuntimeForm(config = {}) {
  return {
    runtimeProvider: config.runtimeProvider || 'browser-local',
    modelsDir: config.modelsDir || '',
    localBridgeUrl: config.localBridgeUrl || 'http://127.0.0.1:8484',
    localComfyUrl: config.localComfyUrl || 'http://127.0.0.1:8188',
    saveDirectory: config.saveDirectory || '',
    facefusionCommand: config.facefusionCommand || 'facefusion',
  };
}

// ⚡ Bolt: Wrap ConfigPanel in React.memo() to prevent unnecessary re-renders
// when parent component (App.jsx) state updates frequently (e.g. typing in modal).
// This ensures a smooth typing experience and reduces CPU overhead.
export const ConfigPanel = React.memo(function ConfigPanel() {
  const { theme } = useVaultTheme();
  const [edit, setEdit] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);
  const [configSource, setConfigSource] = useState('local');
  const [runtimeForm, setRuntimeForm] = useState(pickRuntimeForm());
  const [configSnapshot, setConfigSnapshot] = useState(null);
  const runtimeDraftRef = useRef(pickRuntimeForm());
  const runtimeFormElementRef = useRef(null);

  const isDirty = useMemo(() => edit !== initialValue, [edit, initialValue]);
  const catalogSummary = useMemo(
    () => summarizeModelCatalog(configSnapshot?.scannedModels),
    [configSnapshot],
  );

  function syncEditor(config, source) {
    const normalized = normalizeConfigPayload(config);
    const serialized = formatConfig(normalized);
    const nextRuntimeForm = pickRuntimeForm(normalized);
    setEdit(serialized);
    setInitialValue(serialized);
    setRuntimeForm(nextRuntimeForm);
    runtimeDraftRef.current = nextRuntimeForm;
    setConfigSnapshot(normalized);
    setConfigSource(source);
  }

  function handleRuntimeFieldChange(key, value) {
    setRuntimeForm((current) => {
      const next = {
        ...current,
        [key]: value,
      };
      runtimeDraftRef.current = next;
      return next;
    });
  }

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setBanner(null);

    const runtime = api.getApiRuntime ? api.getApiRuntime() : { mode: 'local-fallback' };
    const usingRemote = runtime.mode === 'remote-with-local-fallback';

    try {
      let config;
      let source = 'local';

      if (typeof api.fetchConfig === 'function') {
        const response = await api.fetchConfig();
        config = normalizeConfigPayload(response);
        source = usingRemote ? 'api' : 'local';
        saveLocalConfig(config);
      } else {
        config = getLocalConfig();
      }

      syncEditor(config, source);

      if (!usingRemote) {
        setBanner({
          type: 'warning',
          title: 'Using browser-local configuration',
          description: 'The app is running in local-demo fallback mode. Your settings are stored in local storage instead of a remote database. Please configure VITE_API_URL to run connected.',
        });
      }
    } catch (error) {
      const fallbackConfig = getLocalConfig();
      syncEditor(fallbackConfig, 'local-fallback');
      setBanner({
        type: 'warning',
        title: 'API load failed',
        description: 'Loaded the last local config snapshot instead.',
        details: { error: error.message },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleUpdate = async () => {
    setSaving(true);
    setBanner(null);

    try {
      const nextConfig = JSON.parse(edit);
      let response = null;
      let source = 'local';

      if (typeof api.updateConfig === 'function') {
        response = await api.updateConfig(nextConfig);
        source = 'api';
      } else {
        response = {
          saved: true,
          source: 'local',
        };
      }

      saveLocalConfig(nextConfig);
      syncEditor(nextConfig, source);
      setBanner({
        type: source === 'api' ? 'success' : 'warning',
        title: source === 'api' ? 'Config updated' : 'Config saved locally',
        description: source === 'api'
          ? 'The config API accepted the updated configuration.'
          : 'The config API is not available yet, so the update was stored locally.',
        details: response,
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        setBanner({
          type: 'error',
          title: 'Invalid JSON',
          description: 'Fix the JSON formatting before saving.',
          details: { error: error.message },
        });
      } else {
        try {
          const nextConfig = JSON.parse(edit);
          saveLocalConfig(nextConfig);
          syncEditor(nextConfig, 'local-fallback');
          setBanner({
            type: 'warning',
            title: 'API save failed',
            description: 'The config was saved locally so your changes are not lost.',
            details: { error: error.message },
          });
        } catch (parseError) {
          setBanner({
            type: 'error',
            title: 'Save failed',
            description: 'The API update failed and the current editor contents are not valid JSON.',
            details: {
              apiError: error.message,
              parseError: parseError.message,
            },
          });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  async function handleRuntimeSave() {
    setSaving(true);
    setBanner(null);

    try {
      const formData = runtimeFormElementRef.current
        ? new FormData(runtimeFormElementRef.current)
        : null;
      const nextRuntimeForm = formData
        ? {
            runtimeProvider: String(formData.get('runtimeProvider') || runtimeDraftRef.current.runtimeProvider),
            modelsDir: String(formData.get('modelsDir') || ''),
            localBridgeUrl: String(formData.get('localBridgeUrl') || ''),
            localComfyUrl: String(formData.get('localComfyUrl') || ''),
            saveDirectory: String(formData.get('saveDirectory') || ''),
            facefusionCommand: String(formData.get('facefusionCommand') || ''),
          }
        : runtimeDraftRef.current;

      runtimeDraftRef.current = nextRuntimeForm;
      const updated = await api.updateConfig(nextRuntimeForm);
      saveLocalConfig(updated);
      syncEditor(updated, 'api');
      setBanner({
        type: 'success',
        title: 'Runtime settings updated',
        description: 'Local execution settings are now saved in the shared app config.',
        details: nextRuntimeForm,
      });
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Runtime update failed',
        description: error.message || 'Could not save the runtime settings.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleModelRefresh() {
    setSaving(true);
    setBanner(null);

    try {
      const scannedModels = await api.scanLocalModels();
      const updated = await api.fetchConfig();
      saveLocalConfig(updated);
      syncEditor(updated, 'api');
      setBanner({
        type: scannedModels.warnings?.length ? 'warning' : 'success',
        title: 'Model catalog refreshed',
        description: scannedModels.warnings?.length
          ? scannedModels.warnings.join(' ')
          : 'The local model catalog was refreshed successfully.',
      });
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Model refresh failed',
        description: error.message || 'Could not refresh the local model catalog.',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="p-4 rounded shadow bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
      style={{ borderColor: theme.accent }}
    >
      <div className="flex flex-col gap-2 mb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: theme.accent }}>Config</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Configure the shared runtime once, then let every current and future flow reuse the same local model catalog.
          </p>
        </div>
        <div className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
          Source: {configSource}
        </div>
      </div>

      <div className="mb-4 rounded border border-vault-200 bg-vault-50 p-4 dark:border-vault-700 dark:bg-vault-950/30">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Local Execution Bridge</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A Vercel-hosted page cannot browse your Windows model folder directly. Use these settings to point the app at a machine-local bridge and/or a local ComfyUI server.
          </p>
        </div>

        <form ref={runtimeFormElementRef} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Runtime Provider</span>
            <select
              name="runtimeProvider"
              value={runtimeForm.runtimeProvider}
              onChange={(event) => handleRuntimeFieldChange('runtimeProvider', event.target.value)}
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="browser-local">Browser local only</option>
              <option value="local-bridge">Local bridge</option>
              <option value="local-comfyui">Local ComfyUI API</option>
              <option value="remote-api">Remote API</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Model Directory</span>
            <input
              name="modelsDir"
              value={runtimeForm.modelsDir}
              onChange={(event) => handleRuntimeFieldChange('modelsDir', event.target.value)}
              placeholder="D:\\comfyui\\resources\\comfyui\\models"
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Local Bridge URL</span>
            <input
              name="localBridgeUrl"
              value={runtimeForm.localBridgeUrl}
              onChange={(event) => handleRuntimeFieldChange('localBridgeUrl', event.target.value)}
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Local ComfyUI URL</span>
            <input
              name="localComfyUrl"
              value={runtimeForm.localComfyUrl}
              onChange={(event) => handleRuntimeFieldChange('localComfyUrl', event.target.value)}
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Save Directory</span>
            <input
              name="saveDirectory"
              value={runtimeForm.saveDirectory}
              onChange={(event) => handleRuntimeFieldChange('saveDirectory', event.target.value)}
              placeholder="Optional output folder for local jobs"
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">FaceFusion Command</span>
            <input
              name="facefusionCommand"
              value={runtimeForm.facefusionCommand}
              onChange={(event) => handleRuntimeFieldChange('facefusionCommand', event.target.value)}
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: theme.accent, color: theme.primary }}
            onClick={handleRuntimeSave}
            disabled={loading || saving}
          >
            {saving ? 'Saving...' : 'Save Runtime Settings'}
          </button>
          <button
            className="px-4 py-2 rounded font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleModelRefresh}
            disabled={loading || saving}
          >
            Refresh Model Catalog
          </button>
        </div>

        {catalogSummary.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
            {catalogSummary.map((group) => (
              <span key={group.key} className="rounded border border-gray-200 px-2 py-1 dark:border-gray-700">
                {group.label}: {group.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          className="px-4 py-2 rounded font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: theme.accent, color: theme.primary }}
          onClick={loadConfig}
          disabled={loading || saving}
        >
          {loading ? 'Loading...' : 'Reload'}
        </button>
        <button
          className="px-4 py-2 rounded font-bold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => {
            setEdit(initialValue);
            const nextRuntimeForm = pickRuntimeForm(configSnapshot || {});
            setRuntimeForm(nextRuntimeForm);
            runtimeDraftRef.current = nextRuntimeForm;
            setBanner(null);
          }}
          disabled={loading || saving || !isDirty}
        >
          Reset Changes
        </button>
      </div>

      {banner && (
        <div className={`mb-3 rounded border p-3 ${getBannerTone(banner.type)}`}>
          <div className="font-semibold">{banner.title}</div>
          <div className="text-sm mt-1">{banner.description}</div>
          {banner.details && (
            <pre className="mt-3 p-2 rounded text-xs overflow-x-auto bg-white/60 dark:bg-black/20">
              {JSON.stringify(banner.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
          Loading configuration...
        </div>
      ) : (
        <>
          <textarea
            className="w-full p-3 border rounded dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 font-mono text-sm"
            rows={14}
            value={edit}
            onChange={(event) => setEdit(event.target.value)}
            disabled={saving}
            spellCheck={false}
          />

          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isDirty ? 'Unsaved changes in editor.' : 'Editor matches the last saved snapshot.'}
            </div>
            <button
              className="px-4 py-2 rounded font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: theme.accent, color: theme.primary }}
              onClick={handleUpdate}
              disabled={saving || loading}
            >
              {saving ? 'Saving...' : 'Update Config'}
            </button>
          </div>
        </>
      )}
    </div>
  );
});
