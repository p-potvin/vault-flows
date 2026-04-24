import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateConfigUpdatePayload,
  validateModelCatalog,
  validateWorkflowModelSelections,
} from './validation.js';

function createCatalog() {
  return {
    scannedAt: '2026-04-19T00:00:00.000Z',
    source: 'comfyui',
    modelsDir: 'D:/comfyui/models',
    warnings: [],
    categories: {
      checkpoints: [
        {
          name: 'caption-model.safetensors',
          relativePath: 'checkpoints/caption-model.safetensors',
          value: 'caption-model',
        },
        {
          name: 'base-model.safetensors',
          relativePath: 'checkpoints/base-model.safetensors',
          value: 'base-model',
        },
      ],
      loras: [
        {
          name: 'caption-adapter.safetensors',
          relativePath: 'loras/caption-adapter.safetensors',
          value: 'caption-adapter',
        },
      ],
      insightface: [
        {
          name: 'inswapper_128.onnx',
          relativePath: 'insightface/inswapper_128.onnx',
          value: 'inswapper_128',
        },
      ],
      hyperswap: [
        {
          name: 'hyperswap_v1.onnx',
          relativePath: 'hyperswap/hyperswap_v1.onnx',
          value: 'hyperswap_v1',
        },
      ],
      reactorFaces: [
        {
          name: 'demo-face.json',
          relativePath: 'reactor/faces/demo-face.json',
          value: 'demo-face',
        },
      ],
      facerestoreModels: [
        {
          name: 'gfpgan.pth',
          relativePath: 'facerestore_models/gfpgan.pth',
          value: 'gfpgan',
        },
      ],
      ultralytics: [
        {
          name: 'yolov8-face.pt',
          relativePath: 'ultralytics/yolov8-face.pt',
          value: 'yolov8-face',
        },
      ],
      sams: [],
    },
  };
}

test('validateModelCatalog accepts a complete ComfyUI-style catalog', () => {
  const catalog = createCatalog();
  assert.deepEqual(validateModelCatalog(catalog), catalog);
});

test('validateConfigUpdatePayload accepts valid workflow/model pairings', () => {
  const catalog = createCatalog();
  const payload = validateConfigUpdatePayload(
    {
      flowModelSelections: {
        imageCaptioning: {
          captionModel: 'caption-model',
          captionAdapter: 'caption-adapter',
        },
        loraTraining: {
          baseModel: 'base-model',
        },
        videoFaceSwap: {
          swapModel: 'inswapper_128',
          alternateSwapModel: 'hyperswap_v1',
          faceModel: 'demo-face',
          restoreModel: 'gfpgan',
          detectorModel: 'yolov8-face',
        },
      },
    },
    { scannedModels: catalog },
  );

  assert.equal(payload.flowModelSelections.videoFaceSwap.swapModel, 'inswapper_128');
});

test('validateWorkflowModelSelections rejects unknown workflows', () => {
  const { errors } = validateWorkflowModelSelections(
    {
      unknownFlow: {
        someModel: 'caption-model',
      },
    },
    createCatalog(),
  );

  assert.match(errors[0], /Unknown workflow "unknownFlow"/);
});

test('validateWorkflowModelSelections rejects unknown slots for a known workflow', () => {
  const { errors } = validateWorkflowModelSelections(
    {
      imageCaptioning: {
        swapModel: 'caption-model',
      },
    },
    createCatalog(),
  );

  assert.match(errors[0], /Unknown model slot "swapModel" for workflow "imageCaptioning"/);
});

test('validateWorkflowModelSelections rejects models from the wrong category with a clear error', () => {
  const { errors } = validateWorkflowModelSelections(
    {
      imageCaptioning: {
        captionModel: 'caption-adapter',
      },
    },
    createCatalog(),
  );

  assert.match(
    errors[0],
    /imageCaptioning\.captionModel only accepts Checkpoints/i,
  );
  assert.match(errors[0], /LoRAs/i);
});

test('validateConfigUpdatePayload rejects models that are not in the scanned catalog', () => {
  assert.throws(
    () =>
      validateConfigUpdatePayload(
        {
          flowModelSelections: {
            videoFaceSwap: {
              swapModel: 'missing-model',
            },
          },
        },
        { scannedModels: createCatalog() },
      ),
    /not in the scanned catalog for videoFaceSwap\.swapModel/i,
  );
});
