import type { NodeType } from './types'

export interface NodeMeta {
  label: string
  labelKey: string
  color: string
  defaultParams: Record<string, unknown>
}

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
    defaultParams: { value: '' },
  },
  image_input: {
    label: 'Image Input',
    labelKey: 'node.image_input',
    color: 'var(--vault-console-gold)',
    defaultParams: {
      image_ref: '',
      preview_url: '',
      filename: '',
    },
  },
  llm: {
    label: 'LLM',
    labelKey: 'node.llm',
    color: 'var(--vault-console-violet)',
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
    defaultParams: { template: '{{input}}' },
  },
  output: {
    label: 'Output',
    labelKey: 'node.output',
    color: 'var(--vault-signal-online)',
    defaultParams: {},
  },
  display: {
    label: 'Display',
    labelKey: 'node.display',
    color: 'var(--vault-signal-online)',
    defaultParams: {},
  },
}
