import { useEffect, useRef, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { ReactNode } from 'react'

import { useFlowStore } from '@/store/flowStore'

interface BaseNodeProps {
  nodeId: string
  label: string
  color: string
  children?: ReactNode
}

type LedState = 'idle' | 'running' | 'succeeded' | 'failed' | 'pending'

const PALETTE: Array<{ name: string; value: string | null }> = [
  { name: 'Default',  value: null },
  { name: 'Gold',     value: 'var(--vault-console-gold)' },
  { name: 'Violet',   value: 'var(--vault-console-violet)' },
  { name: 'Copper',   value: 'var(--vault-copper)' },
  { name: 'Online',   value: 'var(--vault-signal-online)' },
  { name: 'Warning',  value: 'var(--vault-signal-warning)' },
  { name: 'Alert',    value: 'var(--vault-signal-alert)' },
]

/**
 * Format the node UID for display. Numeric ids stay as `node#3`; long
 * synthetic ids like `wf-1` or UUIDs get truncated to `node#abc12345`.
 */
function shortenNodeId(id: string): string {
  if (/^\d+$/.test(id)) return `node#${id}`
  if (/^[a-z]+-?\d+$/i.test(id)) return `node#${id}`
  if (id.length <= 10) return `node#${id}`
  return `node#${id.slice(0, 8)}`
}

function ledColorFor(state: LedState): string {
  switch (state) {
    case 'running':   return 'var(--vault-console-violet)'
    case 'succeeded': return 'var(--vault-signal-online)'
    case 'failed':    return 'var(--vault-signal-alert)'
    case 'pending':   return 'var(--vault-copper)'
    case 'idle':
    default:          return 'rgba(255,255,255,0.25)'
  }
}

/**
 * vaultwares-revisited canvas node — supports:
 *   - Per-instance rename via double-click on the header label
 *     (persisted in `params._displayName`)
 *   - Per-instance color override via the swatch in the header
 *     (persisted in `params._color`; null = use type-default)
 *   - Status LED reflecting execution state
 *
 * Inline params live in `children`. Inputs in children should add the
 * `nodrag` className so React Flow doesn't start a drag when the user
 * clicks into a text field.
 */
export function BaseNode({ nodeId, label, color, children }: BaseNodeProps) {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId)
  const executionStatus = useFlowStore((s) => s.executionStatus)
  const executionResults = useFlowStore((s) => s.executionResults)
  const nodes = useFlowStore((s) => s.nodes)
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)

  const node = nodes.find((n) => n.id === nodeId)
  const customName = typeof node?.params?._displayName === 'string' ? node.params._displayName : null
  const customColor = typeof node?.params?._color === 'string' ? node.params._color : null
  const effectiveLabel = customName || label
  const effectiveColor = customColor || color

  const isSelected = selectedNodeId === nodeId

  // LED state from global execution + this node's result entry
  const result = executionResults.find((r) => r.nodeId === nodeId)
  let ledState: LedState = 'idle'
  if (executionStatus === 'running') {
    ledState = result ? (result.error ? 'failed' : 'succeeded') : 'pending'
  } else if (executionStatus === 'done' || executionStatus === 'error') {
    if (result) ledState = result.error ? 'failed' : 'succeeded'
  }
  const ledColor = ledColorFor(ledState)
  const ledPulsing = ledState === 'pending'

  // Rename state
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(effectiveLabel)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (editing) {
      setDraft(effectiveLabel)
      requestAnimationFrame(() => inputRef.current?.select())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function commitRename() {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === label) {
      // Clear the override when the user resets to the default label
      updateNodeParam(nodeId, '_displayName', '')
    } else {
      updateNodeParam(nodeId, '_displayName', next)
    }
  }

  // Color picker open/close
  const [paletteOpen, setPaletteOpen] = useState(false)
  useEffect(() => {
    if (!paletteOpen) return
    const close = () => setPaletteOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [paletteOpen])

  return (
    <div
      className="relative flex min-w-[220px] max-w-[300px] flex-col overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--vault-console-raised) 90%, transparent)',
        border: `1px solid ${isSelected ? effectiveColor : 'var(--vault-console-border-subtle)'}`,
        borderRadius: '14px',
        boxShadow: isSelected
          ? `0 0 0 1px ${effectiveColor}33, 0 6px 18px rgba(0,0,0,0.5)`
          : '0 4px 12px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Accent left rail */}
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: effectiveColor, borderRadius: '14px 0 0 14px' }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-vw-console-border px-3 py-2 pl-4">
        {/* Color swatch — click to open palette */}
        <button
          type="button"
          className="nodrag h-2.5 w-2.5 flex-shrink-0 rounded-full transition-transform hover:scale-125"
          style={{ background: effectiveColor, boxShadow: `0 0 4px ${effectiveColor}` }}
          title="Color"
          onClick={(e) => {
            e.stopPropagation()
            setPaletteOpen((v) => !v)
          }}
        />
        {/* Label — double-click to rename */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setEditing(false)
                setDraft(effectiveLabel)
              }
            }}
            className="nodrag flex-1 rounded-sm border border-vw-console-violet/40 bg-vw-console-bg px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 truncate font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--vault-console-text-secondary)' }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            title="Double-click to rename"
          >
            {effectiveLabel}
          </span>
        )}
        {/* Execution-state LED */}
        <span
          className={ledPulsing ? 'vw-led' : 'vw-led-static'}
          style={{
            width: 7,
            height: 7,
            color: ledColor,
            background: ledColor,
            opacity: ledState === 'idle' ? 0.45 : 1,
          }}
          title={ledState}
        />
      </div>

      {/* Color palette popover */}
      {paletteOpen && (
        <div
          className="nodrag absolute left-3 top-9 z-10 flex gap-1 rounded-lg border border-vw-console-border bg-vw-console-bg/95 p-1.5 shadow-xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {PALETTE.map((p) => (
            <button
              key={p.name}
              type="button"
              className="h-4 w-4 rounded-full border border-white/15 transition-transform hover:scale-125"
              style={{
                background: p.value ?? 'transparent',
                outline: p.value === null ? '1px dashed rgba(255,255,255,0.3)' : 'none',
                outlineOffset: -1,
              }}
              title={p.name}
              onClick={() => {
                updateNodeParam(nodeId, '_color', p.value ?? '')
                setPaletteOpen(false)
              }}
            />
          ))}
        </div>
      )}

      {/* Body */}
      <div className="px-3 py-2 pl-4 text-white">{children}</div>

      {/* Footer — nodeId pill (shortened) for debugging + reference */}
      <div className="flex items-center justify-end border-t border-vw-console-border/60 px-3 py-1 pl-4">
        <span
          className="font-mono text-[9px] uppercase tracking-wider text-white/30"
          title={nodeId}
        >
          {shortenNodeId(nodeId)}
        </span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: effectiveColor,
          border: '2px solid var(--vault-console-bg)',
          width: 10,
          height: 10,
          boxShadow: `0 0 4px ${effectiveColor}`,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: effectiveColor,
          border: '2px solid var(--vault-console-bg)',
          width: 10,
          height: 10,
          boxShadow: `0 0 4px ${effectiveColor}`,
        }}
      />
    </div>
  )
}
