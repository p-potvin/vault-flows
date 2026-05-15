export type NodeType = 'input' | 'output' | 'llm' | 'transform' | 'display'

export type PresetDomain =
  | 'writing'
  | 'education'
  | 'business'
  | 'creative'
  | 'productivity'
  | 'image'

export interface FlowNode {
  id: string
  type: NodeType
  label: string
  position: { x: number; y: number }
  params: Record<string, unknown>
  preset?: string
}

export interface FlowEdge {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

export interface Flow {
  id: string
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  phase: number
  createdAt: string
  updatedAt: string
}

export interface Preset {
  id: string
  name: string
  nameKey: string
  domain: PresetDomain
  description: string
  descriptionKey: string
  flow: Flow
}

export type ExecutionStatus = 'idle' | 'running' | 'done' | 'error'

export interface ExecutionResult {
  nodeId: string
  output: string
  error?: string
}
