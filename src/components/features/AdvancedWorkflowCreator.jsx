import React, { useEffect, useMemo, useState } from 'react';
import {
  createGraphNode,
  getNodeDefinition,
  listNodeDefinitions,
  normalizeWorkflowGraph,
} from '../../lib/workflowGraph';

const NODE_WIDTH = 184;
const NODE_HEIGHT = 120;
const PORT_TOP = 58;

function groupNodeDefinitions(definitions) {
  return definitions.reduce((groups, definition) => {
    const key = definition.category || 'Other';
    return {
      ...groups,
      [key]: [...(groups[key] || []), definition],
    };
  }, {});
}

function getEdgePath(sourceNode, targetNode) {
  const sourceX = sourceNode.position.x + NODE_WIDTH;
  const sourceY = sourceNode.position.y + PORT_TOP;
  const targetX = targetNode.position.x;
  const targetY = targetNode.position.y + PORT_TOP;
  const midX = sourceX + Math.max(80, (targetX - sourceX) / 2);

  return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
}

export default function AdvancedWorkflowCreator({
  workflow,
  graph: initialGraph,
  onSave,
  saveState = 'idle',
}) {
  const [graph, setGraph] = useState(() => normalizeWorkflowGraph(initialGraph, workflow?.id));
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [linkingSource, setLinkingSource] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [configDraft, setConfigDraft] = useState('{}');
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    const normalized = normalizeWorkflowGraph(initialGraph, workflow?.id);
    setGraph(normalized);
    setSelectedNodeId(normalized.nodes[0]?.id || null);
  }, [initialGraph, workflow?.id]);

  const definitions = useMemo(() => listNodeDefinitions(), []);
  const groupedDefinitions = useMemo(() => groupNodeDefinitions(definitions), [definitions]);
  const nodesById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) : null;
  const selectedDefinition = selectedNode ? getNodeDefinition(selectedNode.type) : null;

  useEffect(() => {
    if (selectedNode) {
      setConfigDraft(JSON.stringify(selectedNode.config || {}, null, 2));
      setConfigError('');
    }
  }, [selectedNode]);

  const addNode = (type) => {
    setGraph((current) => ({
      ...current,
      nodes: [...current.nodes, createGraphNode(type, current)],
    }));
  };

  const updateSelectedLabel = (label) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (
        node.id === selectedNodeId ? { ...node, label } : node
      )),
    }));
  };

  const applyConfigDraft = () => {
    try {
      const parsed = JSON.parse(configDraft || '{}');
      setGraph((current) => ({
        ...current,
        nodes: current.nodes.map((node) => (
          node.id === selectedNodeId ? { ...node, config: parsed } : node
        )),
      }));
      setConfigError('');
    } catch {
      setConfigError('Config must be valid JSON.');
    }
  };

  const removeSelectedNode = () => {
    if (!selectedNodeId) {
      return;
    }

    setGraph((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter((edge) => (
        edge.source.nodeId !== selectedNodeId && edge.target.nodeId !== selectedNodeId
      )),
    }));
    setSelectedNodeId(null);
    setLinkingSource(null);
  };

  const connectNodes = (targetNodeId, targetPortId) => {
    if (!linkingSource || linkingSource.nodeId === targetNodeId) {
      setLinkingSource(null);
      return;
    }

    setGraph((current) => {
      const duplicate = current.edges.some((edge) => (
        edge.source.nodeId === linkingSource.nodeId
        && edge.source.portId === linkingSource.portId
        && edge.target.nodeId === targetNodeId
        && edge.target.portId === targetPortId
      ));

      if (duplicate) {
        return current;
      }

      const edge = {
        id: `edge-${linkingSource.nodeId}-${targetNodeId}-${Date.now()}`,
        source: linkingSource,
        target: { nodeId: targetNodeId, portId: targetPortId },
      };

      return {
        ...current,
        edges: [...current.edges, edge],
      };
    });
    setLinkingSource(null);
  };

  const removeEdge = (edgeId) => {
    setGraph((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== edgeId),
    }));
  };

  const startDrag = (event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    setDragState({
      nodeId: node.id,
      offsetX: event.clientX - node.position.x,
      offsetY: event.clientY - node.position.y,
    });
  };

  const moveDrag = (event) => {
    if (!dragState) {
      return;
    }

    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (
        node.id === dragState.nodeId
          ? {
              ...node,
              position: {
                x: Math.max(24, event.clientX - dragState.offsetX),
                y: Math.max(24, event.clientY - dragState.offsetY),
              },
            }
          : node
      )),
    }));
  };

  const stopDrag = () => {
    setDragState(null);
  };

  const saveGraph = () => {
    onSave?.(normalizeWorkflowGraph(graph, workflow?.id));
  };

  return (
    <div className="grid min-h-[720px] grid-cols-1 overflow-hidden rounded-lg border border-vault-200 bg-vault-50 shadow-sm dark:border-vault-700 dark:bg-vault-900 lg:grid-cols-[280px_1fr_320px]">
      <aside className="border-b border-vault-200 bg-vault-100 p-4 dark:border-vault-700 dark:bg-vault-800 lg:border-b-0 lg:border-r">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-vault-700 dark:text-vault-200">Node registry</p>
          <h2 className="text-xl font-semibold text-vault-900 dark:text-vault-50">Add building blocks</h2>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedDefinitions).map(([category, items]) => (
            <section key={category}>
              <h3 className="mb-2 text-sm font-semibold text-vault-800 dark:text-vault-100">{category}</h3>
              <div className="space-y-2">
                {items.map((definition) => (
                  <button
                    key={definition.type}
                    type="button"
                    className="w-full rounded-md border border-vault-200 bg-vault-50 p-3 text-left text-vault-900 transition hover:border-vault-400 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-50 dark:hover:border-vault-300 dark:hover:bg-vault-800"
                    onClick={() => addNode(definition.type)}
                  >
                    <span className="block text-sm font-semibold">{definition.label}</span>
                    <span className="mt-1 block text-xs text-vault-700 dark:text-vault-200">{definition.description}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vault-200 bg-vault-50 p-4 dark:border-vault-700 dark:bg-vault-900">
          <div>
            <p className="text-sm text-vault-700 dark:text-vault-200">{workflow?.category || 'Workflow graph'}</p>
            <h1 className="text-2xl font-semibold text-vault-900 dark:text-vault-50">{workflow?.name || 'Untitled workflow'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {linkingSource ? (
              <span className="rounded-md border border-vault-300 bg-vault-100 px-3 py-2 text-sm text-vault-900 dark:border-vault-600 dark:bg-vault-800 dark:text-vault-50">
                Select an input port
              </span>
            ) : null}
            <button
              type="button"
              className="rounded-md bg-vault-900 px-4 py-2 text-sm font-semibold text-vault-50 transition hover:bg-vault-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vault-100 dark:text-vault-900 dark:hover:bg-vault-200"
              disabled={saveState === 'saving'}
              onClick={saveGraph}
            >
              {saveState === 'saving' ? 'Saving...' : 'Save Graph'}
            </button>
          </div>
        </div>

        <div
          className="relative min-h-[620px] flex-1 overflow-auto bg-vault-50 dark:bg-vault-950"
          onMouseMove={moveDrag}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          <svg className="pointer-events-none absolute left-0 top-0 h-[1600px] w-[2200px]" aria-hidden="true">
            {graph.edges.map((edge) => {
              const sourceNode = nodesById.get(edge.source.nodeId);
              const targetNode = nodesById.get(edge.target.nodeId);

              if (!sourceNode || !targetNode) {
                return null;
              }

              return (
                <path
                  key={edge.id}
                  d={getEdgePath(sourceNode, targetNode)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-vault-400 dark:text-vault-300"
                />
              );
            })}
          </svg>

          {graph.nodes.map((node) => {
            const definition = getNodeDefinition(node.type);
            const isSelected = selectedNodeId === node.id;

            return (
              <article
                key={node.id}
                className={`absolute flex h-[120px] w-[184px] flex-col rounded-lg border bg-vault-50 shadow-sm transition dark:bg-vault-800 ${
                  isSelected
                    ? 'border-vault-500 ring-2 ring-vault-400'
                    : 'border-vault-200 dark:border-vault-700'
                }`}
                style={{ left: node.position.x, top: node.position.y }}
                onMouseDown={(event) => startDrag(event, node)}
              >
                <button
                  type="button"
                  className="flex flex-1 flex-col p-3 text-left"
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-vault-700 dark:text-vault-200">
                    {definition?.category || 'Node'}
                  </span>
                  <span className="mt-1 text-base font-semibold text-vault-900 dark:text-vault-50">{node.label}</span>
                  <span className="mt-1 line-clamp-2 text-xs text-vault-700 dark:text-vault-200">{definition?.description}</span>
                </button>

                {definition?.inputs?.[0] ? (
                  <button
                    type="button"
                    className="absolute -left-3 top-[50px] h-6 w-6 rounded-full border border-vault-300 bg-vault-50 text-[10px] font-bold text-vault-900 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:border-vault-500 dark:bg-vault-900 dark:text-vault-50"
                    title={`Input: ${definition.inputs[0].label}`}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => connectNodes(node.id, definition.inputs[0].id)}
                  >
                    in
                  </button>
                ) : null}

                {definition?.outputs?.[0] ? (
                  <button
                    type="button"
                    className="absolute -right-3 top-[50px] h-6 w-6 rounded-full border border-vault-300 bg-vault-900 text-[10px] font-bold text-vault-50 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:border-vault-500 dark:bg-vault-100 dark:text-vault-900"
                    title={`Output: ${definition.outputs[0].label}`}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={() => setLinkingSource({
                      nodeId: node.id,
                      portId: definition.outputs[0].id,
                    })}
                  >
                    out
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </main>

      <aside className="border-t border-vault-200 bg-vault-100 p-4 dark:border-vault-700 dark:bg-vault-800 lg:border-l lg:border-t-0">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-vault-700 dark:text-vault-200">Inspector</p>
          <h2 className="text-xl font-semibold text-vault-900 dark:text-vault-50">
            {selectedNode ? selectedNode.label : 'No node selected'}
          </h2>
        </div>

        {selectedNode ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-vault-900 dark:text-vault-50">Label</span>
              <input
                className="w-full rounded-md border border-vault-200 bg-vault-50 px-3 py-2 text-vault-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-50"
                value={selectedNode.label}
                onChange={(event) => updateSelectedLabel(event.target.value)}
              />
            </label>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-vault-900 dark:text-vault-50">Ports</h3>
              <div className="space-y-2 text-sm text-vault-800 dark:text-vault-100">
                <div>
                  <span className="font-semibold">Inputs:</span>{' '}
                  {selectedDefinition?.inputs?.length
                    ? selectedDefinition.inputs.map((port) => port.label).join(', ')
                    : 'None'}
                </div>
                <div>
                  <span className="font-semibold">Outputs:</span>{' '}
                  {selectedDefinition?.outputs?.length
                    ? selectedDefinition.outputs.map((port) => port.label).join(', ')
                    : 'None'}
                </div>
              </div>
            </section>

            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-vault-900 dark:text-vault-50">Config JSON</span>
              <textarea
                className="min-h-40 w-full rounded-md border border-vault-200 bg-vault-50 px-3 py-2 font-mono text-sm text-vault-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-50"
                value={configDraft}
                onChange={(event) => setConfigDraft(event.target.value)}
              />
            </label>
            {configError ? <p className="text-sm text-red-600 dark:text-red-300">{configError}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-vault-900 px-3 py-2 text-sm font-semibold text-vault-50 hover:bg-vault-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:bg-vault-100 dark:text-vault-900 dark:hover:bg-vault-200"
                onClick={applyConfigDraft}
              >
                Apply Config
              </button>
              <button
                type="button"
                className="rounded-md border border-red-300 bg-vault-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:border-red-700 dark:bg-vault-900 dark:text-red-300 dark:hover:bg-vault-800"
                onClick={removeSelectedNode}
              >
                Remove Node
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-vault-700 dark:text-vault-200">Select a node to edit its label, ports, and config.</p>
        )}

        <section className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-vault-900 dark:text-vault-50">Edges</h3>
          <div className="space-y-2">
            {graph.edges.length ? graph.edges.map((edge) => (
              <button
                key={edge.id}
                type="button"
                className="block w-full rounded-md border border-vault-200 bg-vault-50 p-2 text-left text-xs text-vault-800 hover:border-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-vault-400 dark:border-vault-700 dark:bg-vault-900 dark:text-vault-100"
                onClick={() => removeEdge(edge.id)}
                title="Remove edge"
              >
                {nodesById.get(edge.source.nodeId)?.label || edge.source.nodeId}
                {' -> '}
                {nodesById.get(edge.target.nodeId)?.label || edge.target.nodeId}
              </button>
            )) : (
              <p className="text-sm text-vault-700 dark:text-vault-200">No edges yet.</p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
