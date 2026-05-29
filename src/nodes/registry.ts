import type { NodeType } from './types'

export type NodeCategory = 'inputs' | 'loaders' | 'generation' | 'transform' | 'outputs'

export interface NodeMeta {
  label: string
  labelKey: string
  color: string
  category: NodeCategory
  /** Short blurb shown under the node label in the browser sidebar. */
  description: string
  defaultParams: Record<string, unknown>
}

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  inputs: 'Inputs',
  loaders: 'Loaders',
  generation: 'Generation',
  transform: 'Transform',
  outputs: 'Outputs',
}

/** Order in which categories appear in the node browser sidebar. */
export const CATEGORY_ORDER: NodeCategory[] = [
  'inputs',
  'loaders',
  'generation',
  'transform',
  'outputs',
]

// Node accent colors map to vaultwares-revisited tokens. Each node type gets
// a distinct color used for: the left rail on the card, the handle dots,
// and the LED on the right-side inspector panel.
//
//   input / image_input  → gold      (user-supplied data)
//   llm / model_call     → violet    (generation step)
//   comfyui_workflow     → gold      (full ComfyUI sub-flow — primary)
//   transform            → relay/blue (data shape change)
//   output               → green     (terminal sink)
//   display              → green     (renders results)
export const NODE_REGISTRY: Record<NodeType, NodeMeta> = {
  input: {
    label: 'Input',
    labelKey: 'node.input',
    color: 'var(--vault-console-gold)',
    category: 'inputs',
    description: 'Short text typed directly into the canvas.',
    defaultParams: { value: '' },
  },
  image_input: {
    label: 'Image Input',
    labelKey: 'node.image_input',
    color: 'var(--vault-console-gold)',
    category: 'inputs',
    description: 'Upload an image; downstream nodes receive a signed ref.',
    defaultParams: {
      image_ref: '',
      preview_url: '',
      filename: '',
    },
  },
  load_text: {
    label: 'Load Text',
    labelKey: 'node.load_text',
    color: 'var(--vault-console-gold)',
    category: 'loaders',
    description: 'Load text from a .txt/.md file or paste a long blob.',
    defaultParams: {
      source: 'inline',  // 'inline' | 'file'
      value: '',
      filename: '',
    },
  },
  load_file: {
    label: 'Load File',
    labelKey: 'node.load_file',
    color: 'var(--vault-console-gold)',
    category: 'loaders',
    description: 'Reference any file by path or upload token.',
    defaultParams: {
      file_ref: '',
      filename: '',
      mime: '',
    },
  },
  llm: {
    label: 'LLM',
    labelKey: 'node.llm',
    color: 'var(--vault-console-violet)',
    category: 'generation',
    description: 'Ollama text generation (legacy alias for Model Call).',
    defaultParams: {
      model: 'llama3',
      system: '',
      temperature: 0.7,
      max_tokens: 1024,
    },
  },
  model_call: {
    label: 'Model Call',
    labelKey: 'node.model_call',
    color: 'var(--vault-console-violet)',
    category: 'generation',
    description: 'Provider-discriminated generation (Ollama / ComfyUI / HTTP).',
    defaultParams: {
      provider: 'ollama',
      model: '',
      system: '',
      prompt: '',
      temperature: 0.7,
    },
  },
  comfyui_workflow: {
    label: 'ComfyUI Workflow',
    labelKey: 'node.comfyui_workflow',
    color: 'var(--vault-console-gold)',
    category: 'generation',
    description: 'Run a saved ComfyUI workflow as one step.',
    defaultParams: {
      workflow_id: '',
      mode: 'local',
      inputs: {},
    },
  },
  transform: {
    label: 'Transform',
    labelKey: 'node.transform',
    color: 'var(--vault-signal-relay)',
    category: 'transform',
    description: 'Reshape upstream output via a {{input}} template.',
    defaultParams: { template: '{{input}}' },
  },
  output: {
    label: 'Output',
    labelKey: 'node.output',
    color: 'var(--vault-signal-online)',
    category: 'outputs',
    description: 'Terminal sink — collects the final value.',
    defaultParams: {},
  },
  display: {
    label: 'Display',
    labelKey: 'node.display',
    color: 'var(--vault-signal-online)',
    category: 'outputs',
    description: 'Render upstream results inline on the canvas.',
    defaultParams: {},
  },
}
