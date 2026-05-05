import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultWorkflowGraph,
  listNodeDefinitions,
  normalizeWorkflowGraph,
  validateWorkflowGraph,
} from './workflowGraph.js';

test('createDefaultWorkflowGraph creates a preset-specific graph', () => {
  const graph = createDefaultWorkflowGraph('wf-demo-caption');

  assert.equal(graph.version, 1);
  assert.deepEqual(
    graph.nodes.map((node) => node.type),
    ['input.asset', 'model.select', 'vision.caption', 'output.result'],
  );
  assert.equal(graph.edges.length, 3);
});

test('normalizeWorkflowGraph falls back when a graph is missing', () => {
  const graph = normalizeWorkflowGraph(null, 'wf-demo-backup');

  assert.equal(graph.nodes[0].type, 'input.asset');
  assert.equal(graph.nodes.at(-1).type, 'output.result');
});

test('normalizeWorkflowGraph removes unsupported nodes and dangling edges', () => {
  const graph = normalizeWorkflowGraph({
    nodes: [
      { id: 'a', type: 'input.asset', position: { x: 1, y: 2 } },
      { id: 'b', type: 'missing.node', position: { x: 2, y: 3 } },
      { id: 'c', type: 'output.result', position: { x: 3, y: 4 } },
    ],
    edges: [
      {
        id: 'edge-ok',
        source: { nodeId: 'a', portId: 'asset' },
        target: { nodeId: 'c', portId: 'input' },
      },
      {
        id: 'edge-bad',
        source: { nodeId: 'a', portId: 'asset' },
        target: { nodeId: 'b', portId: 'input' },
      },
    ],
  });

  assert.deepEqual(graph.nodes.map((node) => node.id), ['a', 'c']);
  assert.deepEqual(graph.edges.map((edge) => edge.id), ['edge-ok']);
});

test('validateWorkflowGraph returns a normalized graph with no errors for registry nodes', () => {
  const graph = createDefaultWorkflowGraph('wf-demo-faceswap');
  const result = validateWorkflowGraph(graph);

  assert.equal(result.errors.length, 0);
  assert.equal(result.graph.nodes.length, 5);
});

test('listNodeDefinitions returns cloned registry definitions', () => {
  const definitions = listNodeDefinitions();

  definitions[0].label = 'Changed';

  assert.notEqual(listNodeDefinitions()[0].label, 'Changed');
});
