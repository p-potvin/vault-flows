import {
  buildFaceSwapManifest,
  createEmptyScannedModels,
  normalizeExecutionConfig,
} from './lib/flowRuntime';
import {
  validateConfigUpdatePayload,
  validateModelCatalog,
  validateWorkflowPayload,
  validateWorkflowUpdatePayload,
} from './validation';

const configuredBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

const WORKFLOWS_KEY = 'vault-flows.workflows';
const CONFIG_KEY = 'vault-flows.config';
const UPLOADS_KEY = 'vault-flows.uploads';
const REMOTE_TIMEOUT_MS = 1500;

const DEFAULT_WORKFLOWS = [
  {
    id: 'wf-demo-caption',
    name: 'Image Caption Review',
    category: 'ML',
    description: 'Review uploaded image metadata and generate a caption draft.',
    favorite: true,
    pin: true,
    lastRun: null,
  },
  {
    id: 'wf-demo-backup',
    name: 'Workflow Backup Export',
    category: 'Data',
    description: 'Package workflow definitions for backup and restore flows.',
    favorite: false,
    pin: false,
    lastRun: null,
  },
  {
    id: 'wf-demo-training',
    name: 'LoRA Prep Pipeline',
    category: 'Reporting',
    description: 'Stage dataset parameters and export a training-ready config bundle.',
    favorite: false,
    pin: false,
    lastRun: null,
  },
  {
    id: 'wf-demo-faceswap',
    name: 'Video Face Swap',
    category: 'ML',
    description: 'Prepare or run a local image-to-video face-swap job against your machine-local runtime.',
    favorite: true,
    pin: false,
    lastRun: null,
  },
  {
    id: 'wf-nerf-automation',
    name: 'NeRF Automation Pipeline',
    category: 'ML',
    description: 'Automated generation of NeRF models from a folder of images, including point cloud extraction and texture baking. Uses local models at D:\\comfyui\\resources\\comfyui\\models\\{model_type}\\{model_name}.',
    favorite: false,
    pin: false,
    lastRun: null,
  },
];

const DEFAULT_CONFIG = normalizeExecutionConfig({
  modelsDir: '',
  preferredStorageProvider: 'other',
  apiMode: configuredBase ? 'remote-with-local-fallback' : 'local-demo',
  apiBase: configuredBase || '',
  apiKey: '', // Stub for API Key Auth
  themeIndex: 0,
  runtimeProvider: configuredBase ? 'remote-api' : 'browser-local',
  scannedModels: createEmptyScannedModels(),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getWorkflows() {
  const workflows = readJson(WORKFLOWS_KEY, DEFAULT_WORKFLOWS);
  if (!Array.isArray(workflows) || workflows.length === 0) {
    writeJson(WORKFLOWS_KEY, DEFAULT_WORKFLOWS);
    return clone(DEFAULT_WORKFLOWS);
  }

  const byId = new Map(workflows.map((workflow) => [workflow.id, workflow]));
  const merged = [
    ...DEFAULT_WORKFLOWS.filter((workflow) => !byId.has(workflow.id)),
    ...workflows,
  ];

  writeJson(WORKFLOWS_KEY, merged);
  return merged;
}

function saveWorkflows(workflows) {
  writeJson(WORKFLOWS_KEY, workflows);
  return workflows;
}

function getConfigState() {
  const config = normalizeExecutionConfig(readJson(CONFIG_KEY, DEFAULT_CONFIG));
  writeJson(CONFIG_KEY, config);
  return config;
}

function saveConfigState(config) {
  const normalized = normalizeExecutionConfig(config);
  writeJson(CONFIG_KEY, normalized);
  return normalized;
}

function getUploads() {
  return readJson(UPLOADS_KEY, []);
}

function saveUploads(uploads) {
  writeJson(UPLOADS_KEY, uploads);
  return uploads;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function parseResponse(res) {
  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  return res.text();
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return parseResponse(response);
}

function trimTrailingSlash(value) {
  return typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';
}

function extractConfigObject(payload) {
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

async function requestWithFallback(path, options, fallback) {
  if (!configuredBase) {
    return fallback({ mode: 'local-demo', remoteAttempted: false });
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    const state = getConfigState();
    const headers = options?.headers || {};
    if (state.apiKey) {
      headers['X-Api-Key'] = state.apiKey;
    }
    
    let res;
    try {
      res = await fetch(`${configuredBase}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }
    return await parseResponse(res);
  } catch (error) {
    return fallback({
      mode: 'local-fallback',
      remoteAttempted: true,
      error,
    });
  }
}

function normalizeWorkflow(workflow) {
  return {
    id: workflow.id || createId('wf'),
    name: workflow.name || 'Untitled workflow',
    category: workflow.category || 'Uncategorized',
    description: workflow.description || '',
    favorite: Boolean(workflow.favorite),
    pin: Boolean(workflow.pin),
    lastRun: workflow.lastRun || null,
  };
}

function serializeUpload(provider, payload) {
  const file =
    payload instanceof FormData ? payload.get('file') || payload.get('asset') : payload;

  const descriptor = file && typeof file === 'object'
    ? {
        name: file.name || 'unnamed-file',
        size: file.size || 0,
        type: file.type || 'application/octet-stream',
      }
    : {
        name: 'unknown-upload',
        size: 0,
        type: 'application/octet-stream',
      };

  return {
    id: createId('upload'),
    provider,
    uploadedAt: new Date().toISOString(),
    ...descriptor,
  };
}

export function getApiRuntime() {
  return {
    mode: configuredBase ? 'remote-with-local-fallback' : 'local-demo',
    apiBase: configuredBase || '',
  };
}

function flattenModelEntries(entries = []) {
  return entries.map((entry) => ({
    name: entry.name || entry.relativePath || entry.value,
    relativePath: entry.relativePath || entry.name || entry.value,
    value: entry.value || entry.relativePath || entry.name,
  }));
}

async function scanModelsViaLocalBridge(config) {
  const bridgeUrl = trimTrailingSlash(config.localBridgeUrl);
  if (!bridgeUrl) {
    throw new Error('Local bridge URL is not configured.');
  }

  const result = await fetchJson(`${bridgeUrl}/models/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelsDir: config.modelsDir || '',
    }),
  });

  return validateModelCatalog(result, 'Local bridge returned an invalid model catalog');
}

async function scanModelsViaComfy(config) {
  const baseUrl = trimTrailingSlash(config.localComfyUrl);
  if (!baseUrl) {
    throw new Error('Local ComfyUI URL is not configured.');
  }

  const folderMap = {
    checkpoints: 'checkpoints',
    loras: 'loras',
    insightface: 'insightface',
    hyperswap: 'hyperswap',
    facerestoreModels: 'facerestore_models',
    ultralytics: 'ultralytics',
    sams: 'sams',
  };

  const categories = createEmptyScannedModels().categories;
  await fetchJson(`${baseUrl}/models`);

  await Promise.all(
    Object.entries(folderMap).map(async ([groupKey, folder]) => {
      try {
        const result = await fetchJson(`${baseUrl}/models/${folder}`);
        categories[groupKey] = flattenModelEntries(Array.isArray(result) ? result : []);
      } catch {
        categories[groupKey] = [];
      }
    }),
  );

  return validateModelCatalog({
    source: 'comfyui',
    scannedAt: new Date().toISOString(),
    modelsDir: config.modelsDir || '',
    warnings: categories.reactorFaces.length === 0
      ? ['Saved ReActor face models require the local bridge scanner because ComfyUI does not expose that nested folder directly.']
      : [],
    categories,
  }, 'ComfyUI returned an invalid model catalog');
}

export async function fetchWorkflows() {
  return requestWithFallback('/workflows', undefined, () => getWorkflows());
}

export async function createWorkflow({ name, category, description = '' }) {
  const payload = validateWorkflowPayload({ name, category, description });

  return requestWithFallback(
    '/workflows',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    () => {
      const workflows = getWorkflows();
      const workflow = normalizeWorkflow(payload);
      saveWorkflows([workflow, ...workflows]);
      return workflow;
    },
  );
}

export async function updateWorkflow(id, data) {
  const payload = validateWorkflowUpdatePayload(data);

  return requestWithFallback(
    `/workflows/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    () => {
      const workflows = getWorkflows();
      let updated;
      const updatedWorkflows = workflows.map((workflow) => {
        if (workflow.id === id) {
          updated = normalizeWorkflow({ ...workflow, ...payload, id });
          return updated;
        }
        return workflow;
      });
      saveWorkflows(updatedWorkflows);
      return updated;
    },
  );
}

export async function deleteWorkflow(id) {
  return requestWithFallback(
    `/workflows/${id}`,
    {
      method: 'DELETE',
    },
    () => {
      const workflows = getWorkflows().filter((workflow) => workflow.id !== id);
      saveWorkflows(workflows);
      return { deleted: true, id };
    },
  );
}

export async function exportWorkflows(ids = []) {
  return requestWithFallback(
    '/workflows/export',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    },
    () => {
      const workflows = getWorkflows();
      const selected = ids.length > 0
        ? workflows.filter((workflow) => ids.includes(workflow.id))
        : workflows;
      return {
        exportedAt: new Date().toISOString(),
        count: selected.length,
        workflows: selected,
      };
    },
  );
}

export async function backupWorkflows() {
  return requestWithFallback(
    '/workflows/backup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
    () => ({
      backedUpAt: new Date().toISOString(),
      count: getWorkflows().length,
      data: getWorkflows(),
    }),
  );
}

export async function restoreWorkflows(data) {
  return requestWithFallback(
    '/workflows/restore',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    },
    () => {
      const restored = Array.isArray(data?.workflows)
        ? data.workflows
        : Array.isArray(data)
          ? data
          : [];
      const normalized = restored.map((workflow) => normalizeWorkflow(workflow));
      saveWorkflows(normalized);
      return {
        restoredAt: new Date().toISOString(),
        count: normalized.length,
      };
    },
  );
}

export async function pinWorkflow(id, pin) {
  return requestWithFallback(
    '/workflows/pin',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pin }),
    },
    () => updateWorkflow(id, { pin }),
  );
}

export async function favoriteWorkflow(id, favorite) {
  return requestWithFallback(
    '/workflows/favorite',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, favorite }),
    },
    () => {
      const workflows = getWorkflows();
      let updated;
      const updatedWorkflows = workflows.map((wf) => {
        if (wf.id === id) {
          updated = { ...wf, favorite };
          return updated;
        }
        return wf;
      });
      saveWorkflows(updatedWorkflows);
      return updated;
    },
  );
}

export async function runWorkflow(id, mode = 'manual') {
  return requestWithFallback(
    '/workflows/run',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, mode }),
    },
    () => {
      const result = {
        runId: createId('run'),
        id,
        mode,
        status: 'completed',
        finishedAt: new Date().toISOString(),
      };
      const workflows = getWorkflows().map((workflow) =>
        workflow.id === id ? { ...workflow, lastRun: result.finishedAt } : workflow,
      );
      saveWorkflows(workflows);
      return result;
    },
  );
}

async function uploadViaProvider(provider, payload) {
  return requestWithFallback(
    `/storage/${provider}/upload`,
    {
      method: 'POST',
      body: payload,
    },
    () => {
      const upload = serializeUpload(provider, payload);
      const uploads = getUploads();
      saveUploads([upload, ...uploads].slice(0, 25));
      return {
        uploaded: true,
        provider,
        upload,
      };
    },
  );
}

export async function uploadGoogleDrive(data) {
  return uploadViaProvider('google-drive', data);
}

export async function uploadDropbox(data) {
  return uploadViaProvider('dropbox', data);
}

export async function uploadIcloud(data) {
  return uploadViaProvider('icloud', data);
}

export async function uploadOther(data) {
  return uploadViaProvider('other', data);
}

export async function uploadToStorage(file, provider = 'other') {
  const payload = new FormData();
  payload.append('file', file);
  return uploadViaProvider(provider, payload);
}

export async function fetchConfig() {
  const result = await requestWithFallback('/config', undefined, () => getConfigState());
  return saveConfigState({
    ...getConfigState(),
    ...extractConfigObject(result),
  });
}

export async function updateConfig(data) {
  const currentConfig = getConfigState();
  const payload = validateConfigUpdatePayload(data, currentConfig);
  const result = await requestWithFallback(
    '/config',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    () => {
      const config = {
        ...currentConfig,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      saveConfigState(config);
      return config;
    },
  );

  return saveConfigState({
    ...currentConfig,
    ...extractConfigObject(result),
    ...payload,
    updatedAt: new Date().toISOString(),
  });
}

export async function scanLocalModels() {
  const config = await fetchConfig();
  let scannedModels;
  let warnings = [];

  if (config.runtimeProvider === 'local-bridge') {
    try {
      scannedModels = await scanModelsViaLocalBridge(config);
    } catch (error) {
      warnings.push(`Local bridge scan failed: ${error.message}`);
    }
  }

  if (!scannedModels && (config.runtimeProvider === 'local-comfyui' || config.runtimeProvider === 'local-bridge')) {
    try {
      scannedModels = await scanModelsViaComfy(config);
    } catch (error) {
      warnings.push(`ComfyUI scan failed: ${error.message}`);
    }
  }

  if (!scannedModels) {
    scannedModels = {
      ...createEmptyScannedModels(),
      source: 'unavailable',
      scannedAt: new Date().toISOString(),
      modelsDir: config.modelsDir || '',
      warnings: warnings.length
        ? warnings
        : ['No local runtime is configured. Use the local bridge or ComfyUI mode to scan models.'],
    };
  } else if (warnings.length) {
    scannedModels = {
      ...scannedModels,
      warnings: [...(scannedModels.warnings || []), ...warnings],
    };
  }

  const updated = await updateConfig({ scannedModels });
  return updated.scannedModels;
}

export async function runFaceSwapVideo({ sourceFile, targetFile, prompt = '', outputName = '' }) {
  const config = await fetchConfig();
  const manifest = buildFaceSwapManifest({
    config,
    sourceFile,
    targetFile,
    prompt,
    outputName,
  });

  if (config.runtimeProvider !== 'local-bridge') {
    return {
      status: 'manual',
      manifest,
      reason: 'Local face-swap execution requires the local bridge runtime.',
    };
  }

  const bridgeUrl = trimTrailingSlash(config.localBridgeUrl);
  if (!bridgeUrl) {
    return {
      status: 'manual',
      manifest,
      reason: 'Local bridge URL is not configured.',
    };
  }

  const formData = new FormData();
  formData.append('job', JSON.stringify(manifest));
  formData.append('source', sourceFile);
  formData.append('target', targetFile);

  let result;
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
    try {
      result = await fetchJson(`${bridgeUrl}/faceswap/run`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    return {
      status: 'manual',
      manifest,
      reason: `Local face swap execution failed. ${error.message}`,
    };
  }

  return {
    ...result,
    manifest,
  };
}

export async function getModelsDir() {
  const config = await fetchConfig();
  return { dir_path: config.modelsDir || '' };
}

export async function setModelsDir(dir_path) {
  const config = await updateConfig({ modelsDir: dir_path });
  return { dir_path: config.modelsDir || '' };
}
