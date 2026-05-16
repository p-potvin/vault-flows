import type { NodeProps, Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type TransformNodeData = FlowNode & { [key: string]: unknown }

export function TransformNode({ data }: NodeProps<Node<TransformNodeData>>) {
  const meta = NODE_REGISTRY['transform']
  const template =
    typeof data.params?.template === 'string' ? data.params.template : '{{input}}'

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <code
        className="block text-xs leading-snug break-all line-clamp-3 font-mono"
        style={{
          color: 'var(--text)',
          background: 'var(--surface-elevated)',
          borderRadius: 'calc(var(--radius-md, 8px) / 2)',
          padding: '4px 6px',
        }}
        title={template}
      >
        {template}
      </code>
    </BaseNode>
  )
}
