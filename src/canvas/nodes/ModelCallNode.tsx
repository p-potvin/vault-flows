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
  InlineSelect,
  InlineAdvanced,
} from './inline'

type ModelCallNodeData = FlowNode & { [key: string]: unknown }

/**
 * Provider-discriminated generation node. Compact view: provider + model +
 * prompt. Advanced: temperature/system/url depending on provider.
 */
export function ModelCallNode({ data }: NodeProps<Node<ModelCallNodeData>>) {
  const meta = NODE_REGISTRY['model_call']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)

  const provider = typeof data.params?.provider === 'string' ? data.params.provider : 'ollama'
  const model = typeof data.params?.model === 'string' ? data.params.model : ''
  const prompt = typeof data.params?.prompt === 'string' ? data.params.prompt : ''
  const system = typeof data.params?.system === 'string' ? data.params.system : ''
  const temperature =
    typeof data.params?.temperature === 'number' ? data.params.temperature : 0.7
  const url = typeof data.params?.url === 'string' ? data.params.url : ''

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <InlineField label="provider">
            <InlineSelect
              value={provider}
              onChange={(e) => updateNodeParam(data.id, 'provider', e.target.value)}
            >
              <option value="ollama">ollama</option>
              <option value="comfyui">comfyui</option>
              <option value="http">http</option>
            </InlineSelect>
          </InlineField>
          {provider !== 'http' && (
            <InlineField label="model">
              <InlineTextInput
                value={model}
                placeholder="(default)"
                onChange={(e) => updateNodeParam(data.id, 'model', e.target.value)}
              />
            </InlineField>
          )}
        </div>

        {provider === 'http' ? (
          <InlineField label="url">
            <InlineTextInput
              value={url}
              placeholder="https://…"
              onChange={(e) => updateNodeParam(data.id, 'url', e.target.value)}
            />
          </InlineField>
        ) : (
          <InlineField label="prompt">
            <InlineTextArea
              value={prompt}
              placeholder="Prompt (or leave blank for upstream)…"
              rows={2}
              onChange={(e) => updateNodeParam(data.id, 'prompt', e.target.value)}
            />
          </InlineField>
        )}

        {provider === 'ollama' && (
          <InlineAdvanced>
            <InlineField label="system">
              <InlineTextArea
                value={system}
                placeholder="System prompt"
                rows={2}
                onChange={(e) => updateNodeParam(data.id, 'system', e.target.value)}
              />
            </InlineField>
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
          </InlineAdvanced>
        )}
      </div>
    </BaseNode>
  )
}
