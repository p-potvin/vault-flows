import { z } from 'zod';
import {
  MODEL_GROUPS,
  WORKFLOW_MODEL_COMPATIBILITY,
  createEmptyScannedModels,
} from './lib/flowRuntime.js';

export const workflowSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  category: z.string().trim().min(2, 'Category must be at least 2 characters'),
  description: z.string().trim().optional().default(''),
});

const workflowUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
    category: z.string().trim().min(2, 'Category must be at least 2 characters').optional(),
    description: z.string().trim().optional(),
  })
  .refine(
    (payload) => Object.values(payload).some((value) => value !== undefined),
    'At least one workflow field must be provided',
  );

const modelEntrySchema = z
  .object({
    name: z.string().trim().min(1, 'Model name is required'),
    relativePath: z.string().trim().min(1, 'Model path is required'),
    value: z.string().trim().min(1, 'Model value is required'),
  })
  .strict();

const categoryShape = Object.fromEntries(
  MODEL_GROUPS.map((group) => [group.key, z.array(modelEntrySchema)]),
);

export const comfyUiModelCatalogSchema = z
  .object({
    scannedAt: z.string(),
    source: z.string(),
    modelsDir: z.string(),
    warnings: z.array(z.string()),
    categories: z.object(categoryShape).strict(),
  })
  .strict();

const flowModelSelectionsSchema = z.record(
  z.string(),
  z.record(z.string(), z.string()),
);

const configUpdateSchema = z
  .object({
    modelsDir: z.string().optional(),
    preferredStorageProvider: z.string().optional(),
    apiMode: z.string().optional(),
    apiBase: z.string().optional(),
    themeIndex: z.number().finite().optional(),
    runtimeProvider: z.string().optional(),
    localBridgeUrl: z.string().optional(),
    localComfyUrl: z.string().optional(),
    saveDirectory: z.string().optional(),
    facefusionCommand: z.string().optional(),
    scannedModels: comfyUiModelCatalogSchema.optional(),
    flowModelSelections: flowModelSelectionsSchema.optional(),
    updatedAt: z.string().optional(),
  })
  .strict();

function flattenIssues(error) {
  return error.issues || error.errors || [];
}

function formatPath(path) {
  return path.length ? path.join('.') : 'request';
}

export function formatValidationError(error, prefix = 'Validation failed') {
  const issues = flattenIssues(error);
  const details = issues
    .map((issue) => `${formatPath(issue.path || [])}: ${issue.message}`)
    .join('; ');
  return details ? `${prefix}: ${details}` : prefix;
}

function parseWithSchema(schema, payload, prefix) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(formatValidationError(result.error, prefix));
  }
  return result.data;
}

function getGroupLabel(groupKey) {
  return MODEL_GROUPS.find((group) => group.key === groupKey)?.label || groupKey;
}

function createCatalogIndex(scannedModels) {
  const catalog = parseWithSchema(
    comfyUiModelCatalogSchema,
    scannedModels,
    'Invalid model catalog',
  );

  const identifierToGroups = new Map();

  for (const [groupKey, entries] of Object.entries(catalog.categories)) {
    for (const entry of entries) {
      for (const identifier of [entry.value, entry.relativePath, entry.name]) {
        const normalized = identifier.trim();
        if (!normalized) {
          continue;
        }
        const current = identifierToGroups.get(normalized) || new Set();
        current.add(groupKey);
        identifierToGroups.set(normalized, current);
      }
    }
  }

  return {
    catalog,
    identifierToGroups,
  };
}

export function validateWorkflowModelSelections(flowModelSelections, scannedModels) {
  const selections = parseWithSchema(
    flowModelSelectionsSchema,
    flowModelSelections,
    'Invalid workflow model selections',
  );
  const { catalog, identifierToGroups } = createCatalogIndex(
    scannedModels || createEmptyScannedModels(),
  );
  const errors = [];

  for (const [workflowId, slotSelections] of Object.entries(selections)) {
    const allowedSlots = WORKFLOW_MODEL_COMPATIBILITY[workflowId];

    if (!allowedSlots) {
      errors.push(
        `Unknown workflow "${workflowId}". Supported workflows: ${Object.keys(
          WORKFLOW_MODEL_COMPATIBILITY,
        ).join(', ')}.`,
      );
      continue;
    }

    for (const [slotKey, rawValue] of Object.entries(slotSelections)) {
      const allowedGroups = allowedSlots[slotKey];

      if (!allowedGroups) {
        errors.push(
          `Unknown model slot "${slotKey}" for workflow "${workflowId}". Allowed slots: ${Object.keys(
            allowedSlots,
          ).join(', ')}.`,
        );
        continue;
      }

      const value = rawValue.trim();
      if (!value) {
        continue;
      }

      const matchedGroups = identifierToGroups.get(value);
      if (!matchedGroups || matchedGroups.size === 0) {
        errors.push(
          `Model "${value}" is not in the scanned catalog for ${workflowId}.${slotKey}. Refresh the model catalog or clear this selection.`,
        );
        continue;
      }

      const hasAllowedGroup = allowedGroups.some((groupKey) => matchedGroups.has(groupKey));
      if (hasAllowedGroup) {
        continue;
      }

      errors.push(
        `Model "${value}" is available under ${Array.from(matchedGroups)
          .map(getGroupLabel)
          .join(', ')}, but ${workflowId}.${slotKey} only accepts ${allowedGroups
          .map(getGroupLabel)
          .join(', ')}.`,
      );
    }
  }

  return {
    catalog,
    errors,
  };
}

export function validateWorkflowPayload(payload) {
  return parseWithSchema(workflowSchema, payload, 'Invalid workflow payload');
}

export function validateWorkflowUpdatePayload(payload) {
  return parseWithSchema(workflowUpdateSchema, payload, 'Invalid workflow update payload');
}

export function validateModelCatalog(payload, sourceLabel = 'Invalid model catalog') {
  return parseWithSchema(comfyUiModelCatalogSchema, payload, sourceLabel);
}

export function validateConfigUpdatePayload(payload, currentConfig = {}) {
  const parsedPayload = parseWithSchema(configUpdateSchema, payload, 'Invalid config update');

  if (!parsedPayload.flowModelSelections) {
    return parsedPayload;
  }

  const catalog =
    parsedPayload.scannedModels ||
    currentConfig.scannedModels ||
    createEmptyScannedModels();
  const { errors } = validateWorkflowModelSelections(parsedPayload.flowModelSelections, catalog);

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  return parsedPayload;
}
