import type { NodeProps, Node } from '@xyflow/react'
import { ArrowDownToLine } from 'lucide-react'
import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type OutputNodeData = FlowNode & { [key: string]: unknown }

export function OutputNode({ data }: NodeProps<Node<OutputNodeData>>) {
  const meta = NODE_REGISTRY['output']
  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <div className="flex items-center gap-1.5 text-white/55">
        <ArrowDownToLine className="h-3 w-3" />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          Sink
        </span>
      </div>
    </BaseNode>
  )
}
