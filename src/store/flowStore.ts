import { create } from 'zustand'
import type {
  FlowNode,
  FlowEdge,
  Flow,
  Preset,
  PresetDomain,
  ExecutionStatus,
  ExecutionResult,
} from '@/nodes/types'
import type { PipelinesWorkflow } from '@/api/client'

interface FlowState {
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedNodeId: string | null
  activePreset: Preset | null
  executionStatus: ExecutionStatus
  executionResults: ExecutionResult[]
  executionError: string | null

  /** Cache of pipelines workflows keyed by id. Populated by the
   * WorkflowLibrary on mount and consulted by the NodeParamPanel to
   * render a structured editor for `comfyui_workflow` nodes. */
  workflowsById: Record<string, PipelinesWorkflow>

  loadPreset: (preset: Preset) => void
  /** Build a synthetic single-step flow from a pipelines workflow:
   * one `comfyui_workflow` node (with workflow_id + empty inputs) wired
   * to a `display` node. Selects the workflow node so the structured
   * inputs editor opens automatically. */
  loadFromComfyWorkflow: (workflow: PipelinesWorkflow) => void
  setPipelinesWorkflows: (workflows: PipelinesWorkflow[]) => void
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  updateNodeParam: (nodeId: string, key: string, value: unknown) => void
  selectNode: (nodeId: string | null) => void
  setExecutionStatus: (status: ExecutionStatus) => void
  setExecutionResults: (results: ExecutionResult[]) => void
  setExecutionError: (error: string | null) => void
  resetExecution: () => void
  toFlow: () => Flow
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activePreset: null,
  executionStatus: 'idle',
  executionResults: [],
  executionError: null,
  workflowsById: {},

  loadPreset: (preset) =>
    set({
      nodes: preset.flow.nodes,
      edges: preset.flow.edges,
      activePreset: preset,
      selectedNodeId: null,
      executionStatus: 'idle',
      executionResults: [],
      executionError: null,
    }),

  setPipelinesWorkflows: (workflows) =>
    set({
      workflowsById: Object.fromEntries(workflows.map((w) => [w.id, w])),
    }),

  loadFromComfyWorkflow: (workflow) => {
    const step = (workflow.steps ?? []).find((s) => s?.kind === 'comfyui_graph')
    const inputPaths = step?.input_paths ?? {}
    const imageInputs = step?.image_inputs ?? []

    // Seed an empty value for every declared input — the structured editor
    // in NodeParamPanel renders one field per key and writes back into
    // params.inputs[key]. Image keys default to empty strings; once the
    // user picks a file the upload token replaces the empty string.
    const inputs: Record<string, unknown> = {}
    for (const key of Object.keys(inputPaths)) {
      inputs[key] = ''
    }

    // Single comfyui_workflow node — results render INLINE on this node
    // (no separate Display node). Keeps the canvas uncluttered and avoids
    // the confusion of a disconnected/orphan "Result" placeholder.
    const wfNodeId = 'wf-1'
    const nodes: FlowNode[] = [
      {
        id: wfNodeId,
        type: 'comfyui_workflow',
        label: workflow.name,
        position: { x: 280, y: 200 },
        params: {
          workflow_id: workflow.id,
          mode: 'local',
          inputs,
          _image_inputs: imageInputs,    // hint for the editor; ignored by server
          _input_paths: inputPaths,      // ditto
        },
      },
    ]

    const edges: FlowEdge[] = []

    const now = new Date().toISOString()
    const synthetic: Preset = {
      id: workflow.id,
      name: workflow.name,
      nameKey: '',
      domain: (workflow.category as PresetDomain | undefined) ?? 'image',
      description: workflow.description ?? '',
      descriptionKey: '',
      flow: {
        id: workflow.id,
        name: workflow.name,
        nodes,
        edges,
        phase: 0,
        createdAt: now,
        updatedAt: now,
      },
    }

    set((state) => ({
      nodes,
      edges,
      activePreset: synthetic,
      selectedNodeId: wfNodeId,  // open the inputs editor immediately
      executionStatus: 'idle',
      executionResults: [],
      executionError: null,
      // Make sure the loaded workflow is in the cache (for the param panel)
      workflowsById: { ...state.workflowsById, [workflow.id]: workflow },
    }))
  },

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  updateNodeParam: (nodeId, key, value) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, [key]: value } } : n,
      ),
    })),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setExecutionStatus: (status) => set({ executionStatus: status }),

  setExecutionResults: (results) => set({ executionResults: results }),

  setExecutionError: (error) => set({ executionError: error }),

  resetExecution: () =>
    set({ executionStatus: 'idle', executionResults: [], executionError: null }),

  toFlow: (): Flow => {
    const { nodes, edges, activePreset } = get()
    const now = new Date().toISOString()
    return {
      id: activePreset?.flow.id ?? crypto.randomUUID(),
      name: activePreset?.flow.name ?? 'Untitled Flow',
      nodes,
      edges,
      phase: 0,
      createdAt: activePreset?.flow.createdAt ?? now,
      updatedAt: now,
    }
  },
}))
