const MODEL_GROUPS = [
  { key: 'checkpoints', label: 'Checkpoints' },
  { key: 'loras', label: 'LoRAs' },
  { key: 'insightface', label: 'InsightFace / swap models' },
  { key: 'hyperswap', label: 'HyperSwap' },
  { key: 'reactorFaces', label: 'Saved face models' },
  { key: 'facerestoreModels', label: 'Face restore models' },
  { key: 'ultralytics', label: 'Detection models' },
  { key: 'sams', label: 'SAM models' },
];

export const FLOW_MODEL_SLOTS = {
  imageCaptioning: [
    {
      key: 'captionModel',
      label: 'Caption model',
      group: 'checkpoints',
      placeholder: 'Select the local caption/VLM checkpoint you want to use',
    },
    {
      key: 'captionAdapter',
      label: 'Caption LoRA / adapter',
      group: 'loras',
      placeholder: 'Optional local LoRA or adapter',
      optional: true,
    },
  ],
  loraTraining: [
    {
      key: 'baseModel',
      label: 'Base checkpoint',
      group: 'checkpoints',
      placeholder: 'Select the local base model for this LoRA plan',
    },
  ],
  videoFaceSwap: [
    {
      key: 'swapModel',
      label: 'Face swap model',
      group: 'insightface',
      placeholder: 'Select the exact local swap model',
    },
    {
      key: 'alternateSwapModel',
      label: 'HyperSwap model',
      group: 'hyperswap',
      placeholder: 'Optional HyperSwap model override',
      optional: true,
    },
    {
      key: 'faceModel',
      label: 'Saved face model',
      group: 'reactorFaces',
      placeholder: 'Optional reusable face embedding model',
      optional: true,
    },
    {
      key: 'restoreModel',
      label: 'Face restorer',
      group: 'facerestoreModels',
      placeholder: 'Optional face restore model',
      optional: true,
    },
    {
      key: 'detectorModel',
      label: 'Detector model',
      group: 'ultralytics',
      placeholder: 'Optional face detector override',
      optional: true,
    },
  ],
};

const DEFAULT_FLOW_SELECTIONS = Object.fromEntries(
  Object.entries(FLOW_MODEL_SLOTS).map(([flowId, slots]) => [
    flowId,
    Object.fromEntries(slots.map((slot) => [slot.key, ''])),
  ]),
);

export function createEmptyScannedModels() {
  return {
    scannedAt: '',
    source: 'none',
    modelsDir: '',
    warnings: [],
    categories: Object.fromEntries(MODEL_GROUPS.map((group) => [group.key, []])),
  };
}

function normalizeModelEntry(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return {
      name: entry,
      relativePath: entry,
      value: entry,
    };
  }

  if (typeof entry === 'object') {
    const name = entry.name || entry.relativePath || entry.value || entry.path;
    if (!name) {
      return null;
    }

    const value = entry.value || entry.relativePath || entry.path || name;

    return {
      name,
      relativePath: entry.relativePath || name,
      value,
    };
  }

  return null;
}

export function normalizeScannedModels(payload) {
  const next = createEmptyScannedModels();

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return next;
  }

  next.scannedAt = typeof payload.scannedAt === 'string' ? payload.scannedAt : '';
  next.source = typeof payload.source === 'string' ? payload.source : 'unknown';
  next.modelsDir = typeof payload.modelsDir === 'string' ? payload.modelsDir : '';
  next.warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((warning) => typeof warning === 'string')
    : [];

  const categories = payload.categories && typeof payload.categories === 'object'
    ? payload.categories
    : {};

  for (const group of MODEL_GROUPS) {
    next.categories[group.key] = Array.isArray(categories[group.key])
      ? categories[group.key].map(normalizeModelEntry).filter(Boolean)
      : [];
  }

  return next;
}

export function normalizeExecutionConfig(config = {}) {
  const next = config && typeof config === 'object' && !Array.isArray(config)
    ? { ...config }
    : {};

  const runtimeProvider =
    typeof next.runtimeProvider === 'string' && next.runtimeProvider
      ? next.runtimeProvider
      : next.apiBase
        ? 'remote-api'
        : 'browser-local';

  return {
    modelsDir: typeof next.modelsDir === 'string' ? next.modelsDir : '',
    preferredStorageProvider:
      typeof next.preferredStorageProvider === 'string' && next.preferredStorageProvider
        ? next.preferredStorageProvider
        : 'other',
    apiMode: typeof next.apiMode === 'string' && next.apiMode ? next.apiMode : 'local-demo',
    apiBase: typeof next.apiBase === 'string' ? next.apiBase : '',
    apiKey: typeof next.apiKey === 'string' ? next.apiKey : '',
    themeIndex: Number.isFinite(next.themeIndex) ? next.themeIndex : 0,
    runtimeProvider,
    localBridgeUrl:
      typeof next.localBridgeUrl === 'string' && next.localBridgeUrl
        ? next.localBridgeUrl
        : 'http://127.0.0.1:8484',
    localComfyUrl:
      typeof next.localComfyUrl === 'string' && next.localComfyUrl
        ? next.localComfyUrl
        : 'http://127.0.0.1:8188',
    saveDirectory: typeof next.saveDirectory === 'string' ? next.saveDirectory : '',
    facefusionCommand:
      typeof next.facefusionCommand === 'string' && next.facefusionCommand
        ? next.facefusionCommand
        : 'facefusion',
    scannedModels: normalizeScannedModels(next.scannedModels),
    flowModelSelections: {
      ...DEFAULT_FLOW_SELECTIONS,
      ...(next.flowModelSelections && typeof next.flowModelSelections === 'object'
        ? next.flowModelSelections
        : {}),
    },
  };
}

export function getFlowSelection(config, flowId) {
  const normalized = normalizeExecutionConfig(config);
  return {
    ...(DEFAULT_FLOW_SELECTIONS[flowId] || {}),
    ...(normalized.flowModelSelections[flowId] || {}),
  };
}

export function getModelGroupLabel(groupKey) {
  return MODEL_GROUPS.find((group) => group.key === groupKey)?.label || groupKey;
}

export function getModelOptions(config, groupKey) {
  const normalized = normalizeExecutionConfig(config);
  return normalized.scannedModels.categories[groupKey] || [];
}

export function summarizeModelCatalog(scannedModels) {
  const normalized = normalizeScannedModels(scannedModels);
  return MODEL_GROUPS.map((group) => ({
    ...group,
    count: normalized.categories[group.key].length,
  })).filter((group) => group.count > 0);
}

export function buildCaptionExecutionManifest({ config, analysis, subjectHint, contextHint, captionDraft, tags }) {
  const normalized = normalizeExecutionConfig(config);
  return {
    flowId: 'imageCaptioning',
    createdAt: new Date().toISOString(),
    runtimeProvider: normalized.runtimeProvider,
    modelsDir: normalized.modelsDir,
    selectedModels: getFlowSelection(normalized, 'imageCaptioning'),
    analysis,
    subjectHint,
    contextHint,
    captionDraft,
    tags,
  };
}

export function buildLoRAPlanManifest({ config, plan, payload }) {
  const normalized = normalizeExecutionConfig(config);
  return {
    flowId: 'loraTraining',
    createdAt: new Date().toISOString(),
    runtimeProvider: normalized.runtimeProvider,
    modelsDir: normalized.modelsDir,
    selectedModels: getFlowSelection(normalized, 'loraTraining'),
    plan,
    payload,
  };
}

export function buildFaceSwapManifest({ config, sourceFile, targetFile, prompt, outputName }) {
  const normalized = normalizeExecutionConfig(config);
  const models = getFlowSelection(normalized, 'videoFaceSwap');

  return {
    flowId: 'videoFaceSwap',
    createdAt: new Date().toISOString(),
    runtimeProvider: normalized.runtimeProvider,
    modelsDir: normalized.modelsDir,
    localBridgeUrl: normalized.localBridgeUrl,
    localComfyUrl: normalized.localComfyUrl,
    facefusionCommand: normalized.facefusionCommand,
    saveDirectory: normalized.saveDirectory,
    prompt,
    outputName,
    inputs: {
      sourceImage: sourceFile
        ? { name: sourceFile.name, type: sourceFile.type, size: sourceFile.size }
        : null,
      targetVideo: targetFile
        ? { name: targetFile.name, type: targetFile.type, size: targetFile.size }
        : null,
    },
    selectedModels: models,
  };
}
