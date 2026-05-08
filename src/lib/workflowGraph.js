export const WORKFLOW_GRAPH_VERSION = 1;

export const NODE_REGISTRY = {
  'input.asset': {
    type: 'input.asset',
    label: 'Asset Input',
    category: 'Input',
    description: 'Accepts a file, folder, text prompt, or runtime value.',
    inputs: [],
    outputs: [{ id: 'asset', label: 'Asset', dataType: 'asset' }],
    defaults: { required: true },
  },
  'model.select': {
    type: 'model.select',
    label: 'Model Selector',
    category: 'Runtime',
    description: 'Chooses an available local or remote model for downstream nodes.',
    inputs: [{ id: 'request', label: 'Request', dataType: 'any' }],
    outputs: [{ id: 'model', label: 'Model', dataType: 'model' }],
    defaults: { modelGroup: 'checkpoints' },
  },
  'vision.caption': {
    type: 'vision.caption',
    label: 'Image Caption',
    category: 'Vision',
    description: 'Generates or reviews caption text from an image asset.',
    inputs: [
      { id: 'image', label: 'Image', dataType: 'image' },
      { id: 'model', label: 'Model', dataType: 'model' },
    ],
    outputs: [{ id: 'caption', label: 'Caption', dataType: 'text' }],
    defaults: { tone: 'descriptive' },
  },
  'training.loraPrep': {
    type: 'training.loraPrep',
    label: 'LoRA Prep',
    category: 'Training',
    description: 'Packages dataset settings into a training-ready config.',
    inputs: [
      { id: 'dataset', label: 'Dataset', dataType: 'asset' },
      { id: 'caption', label: 'Caption', dataType: 'text' },
    ],
    outputs: [{ id: 'manifest', label: 'Manifest', dataType: 'manifest' }],
    defaults: { repeats: 10, resolution: 1024 },
  },
  'video.faceSwap': {
    type: 'video.faceSwap',
    label: 'Face Swap',
    category: 'Video',
    description: 'Prepares a local image-to-video face-swap job.',
    inputs: [
      { id: 'source', label: 'Source Face', dataType: 'image' },
      { id: 'target', label: 'Target Video', dataType: 'video' },
      { id: 'model', label: 'Model', dataType: 'model' },
    ],
    outputs: [{ id: 'job', label: 'Job', dataType: 'manifest' }],
    defaults: { runtime: 'local-bridge' },
  },
  'storage.export': {
    type: 'storage.export',
    label: 'Export',
    category: 'Storage',
    description: 'Writes a workflow result, manifest, or file bundle to storage.',
    inputs: [{ id: 'payload', label: 'Payload', dataType: 'any' }],
    outputs: [{ id: 'receipt', label: 'Receipt', dataType: 'receipt' }],
    defaults: { provider: 'other' },
  },
  'control.branch': {
    type: 'control.branch',
    label: 'Branch',
    category: 'Logic',
    description: 'Routes execution based on a condition.',
    inputs: [{ id: 'value', label: 'Value', dataType: 'any' }],
    outputs: [
      { id: 'true', label: 'True', dataType: 'any' },
      { id: 'false', label: 'False', dataType: 'any' },
    ],
    defaults: { condition: 'value exists' },
  },
  'output.result': {
    type: 'output.result',
    label: 'Result',
    category: 'Output',
    description: 'Marks the final workflow output.',
    inputs: [{ id: 'input', label: 'Input', dataType: 'any' }],
    outputs: [],
    defaults: {},
  },
};

const PRESET_BLUEPRINTS = {
  'wf-demo-caption': ['input.asset', 'model.select', 'vision.caption', 'output.result'],
  'wf-demo-training': ['input.asset', 'vision.caption', 'training.loraPrep', 'storage.export', 'output.result'],
  'wf-demo-faceswap': ['input.asset', 'model.select', 'video.faceSwap', 'storage.export', 'output.result'],
  'wf-demo-backup': ['input.asset', 'storage.export', 'output.result'],
};

const DEFAULT_BLUEPRINT = ['input.asset', 'model.select', 'storage.export', 'output.result'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createNode(type, index, overrides = {}) {
  const definition = NODE_REGISTRY[type] || NODE_REGISTRY['input.asset'];

  return {
    id: overrides.id || `node-${index + 1}`,
    type: definition.type,
    label: overrides.label || definition.label,
    position: overrides.position || {
      x: 72 + index * 232,
      y: 96 + (index % 2) * 96,
    },
    config: {
      ...clone(definition.defaults),
      ...(overrides.config || {}),
    },
  };
}

function getFirstInputPort(type) {
  return NODE_REGISTRY[type]?.inputs?.[0]?.id || 'input';
}

function getFirstOutputPort(type) {
  return NODE_REGISTRY[type]?.outputs?.[0]?.id || 'output';
}

function createSequentialEdges(nodes) {
  return nodes.slice(0, -1).map((node, index) => {
    const target = nodes[index + 1];

    return {
      id: `edge-${node.id}-${target.id}`,
      source: {
        nodeId: node.id,
        portId: getFirstOutputPort(node.type),
      },
      target: {
        nodeId: target.id,
        portId: getFirstInputPort(target.type),
      },
    };
  });
}

export function getNodeDefinition(type) {
  return NODE_REGISTRY[type] || null;
}

export function listNodeDefinitions() {
  return Object.values(NODE_REGISTRY).map((definition) => clone(definition));
}

export function createDefaultWorkflowGraph(workflowId = 'workflow') {
  const blueprint = PRESET_BLUEPRINTS[workflowId] || DEFAULT_BLUEPRINT;
  const nodes = blueprint.map((type, index) => createNode(type, index));

  return {
    version: WORKFLOW_GRAPH_VERSION,
    id: `graph-${workflowId}`,
    variables: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    nodes,
    edges: createSequentialEdges(nodes),
  };
}

export function createGraphNode(type, graph) {
  const existingNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const node = createNode(type, existingNodes.length, {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    position: {
      x: 96 + (existingNodes.length % 4) * 224,
      y: 120 + Math.floor(existingNodes.length / 4) * 160,
    },
  });

  return node;
}

export function normalizeWorkflowGraph(graph, workflowId = 'workflow') {
  const fallback = createDefaultWorkflowGraph(workflowId);

  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
    return fallback;
  }

  const nodes = Array.isArray(graph.nodes)
    ? graph.nodes
        .filter((node) => node && typeof node === 'object' && NODE_REGISTRY[node.type])
        .map((node, index) => createNode(node.type, index, node))
    : fallback.nodes;

  if (nodes.length === 0) {
    return fallback;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(graph.edges)
    ? graph.edges.filter((edge) => (
        edge?.source?.nodeId
        && edge?.target?.nodeId
        && nodeIds.has(edge.source.nodeId)
        && nodeIds.has(edge.target.nodeId)
      ))
    : fallback.edges;

  return {
    version: WORKFLOW_GRAPH_VERSION,
    id: typeof graph.id === 'string' && graph.id.trim() ? graph.id : fallback.id,
    variables: Array.isArray(graph.variables) ? graph.variables : [],
    viewport: {
      x: Number.isFinite(graph.viewport?.x) ? graph.viewport.x : 0,
      y: Number.isFinite(graph.viewport?.y) ? graph.viewport.y : 0,
      zoom: Number.isFinite(graph.viewport?.zoom) ? graph.viewport.zoom : 1,
    },
    nodes,
    edges,
  };
}

export function validateWorkflowGraph(graph) {
  const normalized = normalizeWorkflowGraph(graph);
  const nodeIds = new Set(normalized.nodes.map((node) => node.id));
  const errors = [];

  for (const node of normalized.nodes) {
    if (!NODE_REGISTRY[node.type]) {
      errors.push(`Unknown node type "${node.type}".`);
    }
  }

  for (const edge of normalized.edges) {
    if (!nodeIds.has(edge.source.nodeId) || !nodeIds.has(edge.target.nodeId)) {
      errors.push(`Edge "${edge.id}" references a missing node.`);
    }
  }

  return {
    graph: normalized,
    errors,
  };
}
