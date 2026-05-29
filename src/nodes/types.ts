// Node taxonomy for the vault-flows graph runner.
//
// `llm` is preserved as a backward-compatible shortcut for
// { type: 'model_call', params.provider: 'ollama' }. New flows should use
// `model_call` with an explicit provider, so the same node renderer can
// dispatch to Ollama / ComfyUI / HTTP / etc. without separate node types.
//
// `comfyui_workflow` runs a ComfyUI graph (referenced by workflow_id in the
// pipelines DB) as a single step inside a vault-flows graph. It enqueues a
// job through pipelines' /workflows/run and polls /jobs/{id} to completion.
export type NodeType =
  | 'input'
  | 'image_input'      // client-uploaded image, server holds a signed ref
  | 'load_text'        // text loaded from a file (.txt/.md) or pasted blob
  | 'load_file'        // arbitrary file reference (path or upload token)
  | 'output'
  | 'llm'              // legacy alias for model_call + provider:ollama
  | 'model_call'       // provider-discriminated generation node
  | 'comfyui_workflow' // run a saved ComfyUI workflow as one step
  | 'transform'
  | 'display'

export type ModelCallProvider = 'ollama' | 'comfyui' | 'http'

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

// What a node produced. `output` is the primary text representation
// (always set, even for binary results we set it to a short summary like
// "[image]"). Specialized fields carry the real payload so the SPA can
// render previews instead of just rendering strings.
export type ResultKind = 'text' | 'image' | 'json' | 'file' | 'job_result'

export interface ExecutionResult {
  nodeId: string
  output: string
  error?: string
  kind?: ResultKind
  /** Set when kind === 'image' — absolute URL or /api-relative path (primary) */
  imageUrl?: string
  /** All output image URLs when the workflow produced more than one. The
   * SPA renders a gallery from this; `imageUrl` is always `imageUrls[0]`. */
  imageUrls?: string[]
  /** Set when kind === 'file' — server-side path or blob ref */
  fileRef?: string
  /** Set when kind === 'json' or 'job_result' — arbitrary structured payload */
  data?: Record<string, unknown>
}
