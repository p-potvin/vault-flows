import type { NodeProps, Node } from '@xyflow/react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import {
  InlineField,
  InlineTextArea,
  InlineTextInput,
  InlineNumberInput,
  InlineAdvanced,
} from './inline'

type LLMNodeData = FlowNode & { [key: string]: unknown }

/**
 * LLM (legacy alias for model_call + ollama). Compact view shows model +
 * prompt textarea; Advanced reveals system prompt, temperature, max_tokens.
 */
export function LLMNode({ data }: NodeProps<Node<LLMNodeData>>) {
  const meta = NODE_REGISTRY['llm']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)

  const model = typeof data.params?.model === 'string' ? data.params.model : 'llama3'
  const prompt = typeof data.params?.prompt === 'string' ? data.params.prompt : ''
  const system = typeof data.params?.system === 'string' ? data.params.system : ''
  const temperature =
    typeof data.params?.temperature === 'number' ? data.params.temperature : 0.7
  const maxTokens =
    typeof data.params?.max_tokens === 'number' ? data.params.max_tokens : 1024

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <div className="flex flex-col gap-2">
        <InlineField label="model">
          <InlineTextInput
            value={model}
            placeholder="llama3"
            onChange={(e) => updateNodeParam(data.id, 'model', e.target.value)}
          />
        </InlineField>
        <InlineField label="prompt">
          <InlineTextArea
            value={prompt}
            placeholder="Prompt (or leave blank to use upstream)…"
            rows={2}
            onChange={(e) => updateNodeParam(data.id, 'prompt', e.target.value)}
          />
        </InlineField>
        <InlineAdvanced>
          <InlineField label="system">
            <InlineTextArea
              value={system}
              placeholder="System prompt"
              rows={2}
              onChange={(e) => updateNodeParam(data.id, 'system', e.target.value)}
            />
          </InlineField>
          <div className="grid grid-cols-2 gap-2">
            <InlineField label="temp">
              <InlineNumberInput
                value={temperature}
                step={0.1}
                min={0}
                max={2}
                onChange={(e) =>
                  updateNodeParam(data.id, 'temperature', parseFloat(e.target.value))
                }
              />
            </InlineField>
            <InlineField label="max_tokens">
              <InlineNumberInput
                value={maxTokens}
                step={64}
                min={1}
                onChange={(e) =>
                  updateNodeParam(data.id, 'max_tokens', parseInt(e.target.value || '0', 10))
                }
              />
            </InlineField>
          </div>
        </InlineAdvanced>
      </div>
    </BaseNode>
  )
}
