import type { NodeProps, Node } from '@xyflow/react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import { InlineField, InlineTextArea } from './inline'

type TransformNodeData = FlowNode & { [key: string]: unknown }

export function TransformNode({ data }: NodeProps<Node<TransformNodeData>>) {
  const meta = NODE_REGISTRY['transform']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)
  const template =
    typeof data.params?.template === 'string' ? data.params.template : '{{input}}'

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <InlineField label="template">
        <InlineTextArea
          value={template}
          rows={3}
          placeholder="{{input}}"
          onChange={(e) => updateNodeParam(data.id, 'template', e.target.value)}
          className="font-mono"
        />
      </InlineField>
    </BaseNode>
  )
}
