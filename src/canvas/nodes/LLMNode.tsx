import type { NodeProps, Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type LLMNodeData = FlowNode & { [key: string]: unknown }

export function LLMNode({ data }: NodeProps<Node<LLMNodeData>>) {
  const meta = NODE_REGISTRY['llm']
  const model = typeof data.params?.model === 'string' ? data.params.model : 'llama3'
  const temperature =
    typeof data.params?.temperature === 'number' ? data.params.temperature : 0.7

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Model
          </span>
          <span
            className="text-xs font-medium truncate max-w-[120px]"
            style={{ color: 'var(--text)' }}
            title={model}
          >
            {model}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Temp
          </span>
          <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {temperature.toFixed(2)}
          </span>
        </div>
      </div>
    </BaseNode>
  )
}
