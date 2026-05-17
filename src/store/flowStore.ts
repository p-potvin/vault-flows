import { create } from 'zustand'
import type {
  FlowNode,
  FlowEdge,
  Flow,
  Preset,
  ExecutionStatus,
  ExecutionResult,
} from '@/nodes/types'

interface FlowState {
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedNodeId: string | null
  activePreset: Preset | null
  executionStatus: ExecutionStatus
  executionResults: ExecutionResult[]
  executionError: string | null

  loadPreset: (preset: Preset) => void
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
