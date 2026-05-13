import type { NodeProps, Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useFlowStore } from '@/store/flowStore'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type DisplayNodeData = FlowNode & { [key: string]: unknown }

export function DisplayNode({ data }: NodeProps<Node<DisplayNodeData>>) {
  const meta = NODE_REGISTRY['display']
  const executionResults = useFlowStore((s) => s.executionResults)
  const result = executionResults.find((r) => r.nodeId === data.id)

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      {result ? (
        result.error ? (
          <p
            className="text-xs leading-snug line-clamp-4 break-words"
            style={{ color: 'var(--error)' }}
            title={result.error}
          >
            {result.error}
          </p>
        ) : (
          <p
            className="text-xs leading-snug line-clamp-4 break-words"
            style={{ color: 'var(--text)' }}
            title={result.output}
          >
            {result.output}
          </p>
        )
      ) : (
        <p
          className="text-xs italic"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          No result yet
        </p>
      )}
    </BaseNode>
  )
}
