import type { NodeType } from './types'

export interface NodeMeta {
  label: string
  labelKey: string
  color: string
  defaultParams: Record<string, unknown>
}

export const NODE_REGISTRY: Record<NodeType, NodeMeta> = {
  input: {
    label: 'Input',
    labelKey: 'node.input',
    color: 'var(--accent)',
    defaultParams: { value: '' },
  },
  llm: {
    label: 'LLM',
    labelKey: 'node.llm',
    color: 'var(--info)',
    defaultParams: {
      model: 'llama3',
      system: '',
      temperature: 0.7,
      max_tokens: 1024,
    },
  },
  transform: {
    label: 'Transform',
    labelKey: 'node.transform',
    color: 'var(--warning)',
    defaultParams: { template: '{{input}}' },
  },
  output: {
    label: 'Output',
    labelKey: 'node.output',
    color: 'var(--success)',
    defaultParams: {},
  },
  display: {
    label: 'Display',
    labelKey: 'node.display',
    color: 'var(--text-muted)',
    defaultParams: {},
  },
}
