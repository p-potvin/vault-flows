/**
 * Strict LoRA training validation defaults to prevent VRAM OOM exceptions.
 * ⚡ Bolt: Centralized limits to avoid memory allocation overhead during training.
 */

const LORA_VALIDATION_DEFAULTS = {
  maxBatchSize: 4,
  maxResolution: 1024,
  maxEpochs: 100,
  minNetworkDim: 4,
  maxNetworkDim: 128,
};

export function validateLoraTrainingConfig(config) {
  if (!config) {
    throw new Error('Config is required for LoRA training.');
  }

  const { batchSize, resolution, epochs, networkDim } = config;

  if (batchSize !== undefined && batchSize !== null && (typeof batchSize !== 'number' || batchSize > LORA_VALIDATION_DEFAULTS.maxBatchSize)) {
    throw new Error(`Security Error: batchSize exceeds maximum allowed limit of ${LORA_VALIDATION_DEFAULTS.maxBatchSize} to prevent OOM DOS.`);
  }

  if (resolution !== undefined && resolution !== null && (typeof resolution !== 'number' || resolution > LORA_VALIDATION_DEFAULTS.maxResolution)) {
    throw new Error(`Security Error: resolution exceeds maximum allowed limit of ${LORA_VALIDATION_DEFAULTS.maxResolution} to prevent OOM DOS.`);
  }

  if (epochs !== undefined && epochs !== null && (typeof epochs !== 'number' || epochs > LORA_VALIDATION_DEFAULTS.maxEpochs)) {
    throw new Error(`Validation Error: epochs exceeds maximum allowed limit of ${LORA_VALIDATION_DEFAULTS.maxEpochs}.`);
  }

  if (networkDim !== undefined && networkDim !== null && (typeof networkDim !== 'number' || networkDim > LORA_VALIDATION_DEFAULTS.maxNetworkDim || networkDim < LORA_VALIDATION_DEFAULTS.minNetworkDim)) {
    throw new Error(`Validation Error: networkDim must be between ${LORA_VALIDATION_DEFAULTS.minNetworkDim} and ${LORA_VALIDATION_DEFAULTS.maxNetworkDim}.`);
  }

  return {
    ...config,
    batchSize: batchSize !== undefined && batchSize !== null ? batchSize : 1,
    resolution: resolution !== undefined && resolution !== null ? resolution : 512,
  };
}
