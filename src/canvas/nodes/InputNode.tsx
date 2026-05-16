import type { NodeProps, Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type InputNodeData = FlowNode & { [key: string]: unknown }

export function InputNode({ data }: NodeProps<Node<InputNodeData>>) {
  const meta = NODE_REGISTRY['input']
  const value = typeof data.params?.value === 'string' ? data.params.value : ''

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <p
        className="text-xs leading-snug line-clamp-3 break-words"
        style={{ color: 'var(--text-secondary)' }}
        title={value || 'No value set'}
      >
        {value || (
          <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
            No value set
          </span>
        )}
      </p>
    </BaseNode>
  )
}
