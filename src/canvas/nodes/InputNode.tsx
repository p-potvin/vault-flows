import type { NodeProps, Node } from '@xyflow/react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import { InlineField, InlineTextArea } from './inline'

type InputNodeData = FlowNode & { [key: string]: unknown }

/**
 * Plain text input. Body is an editable textarea — value is what the
 * downstream nodes receive when the flow runs.
 */
export function InputNode({ data }: NodeProps<Node<InputNodeData>>) {
  const meta = NODE_REGISTRY['input']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)
  const value = typeof data.params?.value === 'string' ? data.params.value : ''

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <InlineField label="value">
        <InlineTextArea
          value={value}
          placeholder="Enter text…"
          rows={3}
          onChange={(e) => updateNodeParam(data.id, 'value', e.target.value)}
        />
      </InlineField>
    </BaseNode>
  )
}
