import type { NodeProps, Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type OutputNodeData = FlowNode & { [key: string]: unknown }

export function OutputNode({ data }: NodeProps<Node<OutputNodeData>>) {
  const meta = NODE_REGISTRY['output']

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: 'var(--success)' }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--success)' }}
        >
          Output
        </span>
      </div>
    </BaseNode>
  )
}
