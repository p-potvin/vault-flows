import { Handle, Position } from '@xyflow/react'
import { useFlowStore } from '@/store/flowStore'

interface BaseNodeProps {
  nodeId: string
  label: string
  color: string
  children?: React.ReactNode
}

export function BaseNode({ nodeId, label, color, children }: BaseNodeProps) {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId)
  const isSelected = selectedNodeId === nodeId

  return (
    <div
      className="relative flex flex-col min-w-[180px] max-w-[260px] overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isSelected ? color : 'var(--border)'}`,
        borderRadius: 'var(--radius-md, 8px)',
        boxShadow: isSelected
          ? `0 0 0 2px ${color}44`
          : '0 1px 4px rgba(0,0,0,0.15)',
      }}
    >
      {/* Left color strip */}
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: color, borderRadius: 'var(--radius-md, 8px) 0 0 var(--radius-md, 8px)' }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 pl-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span
          className="text-xs font-semibold uppercase tracking-wide truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2 pl-4">{children}</div>

      {/* React Flow handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: color,
          border: '2px solid var(--surface)',
          width: 10,
          height: 10,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: color,
          border: '2px solid var(--surface)',
          width: 10,
          height: 10,
        }}
      />
    </div>
  )
}
