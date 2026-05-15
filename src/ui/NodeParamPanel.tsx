import { useTranslation } from 'react-i18next'
import { useFlowStore } from '@/store/flowStore'
import { NODE_REGISTRY } from '@/nodes/registry'
import type { NodeType } from '@/nodes/types'

export function NodeParamPanel() {
  const { t } = useTranslation()
  const nodes = useFlowStore((s) => s.nodes)
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId)
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)
  const executionStatus = useFlowStore((s) => s.executionStatus)
  const executionResults = useFlowStore((s) => s.executionResults)
  const executionError = useFlowStore((s) => s.executionError)
  const resetExecution = useFlowStore((s) => s.resetExecution)

  const node = nodes.find((n) => n.id === selectedNodeId)

  if (!node) {
    return (
      <div
        style={{
          padding: '24px 16px',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          textAlign: 'center',
        }}
      >
        {t('node.params')}
      </div>
    )
  }

  const meta = NODE_REGISTRY[node.type as NodeType]

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Node header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: meta?.color ?? 'var(--accent)',
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
          {node.label}
        </span>
      </div>

      {/* Params */}
      {Object.entries(node.params).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
            }}
          >
            {t(`node.${key}`, { defaultValue: key })}
          </label>
          {typeof value === 'number' ? (
            <input className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
              type="number"
              value={value}
              step={key === 'temperature' ? 0.1 : 1}
              min={0}
              max={key === 'temperature' ? 2 : undefined}
              onChange={(e) => updateNodeParam(node.id, key, parseFloat(e.target.value))}
              style={inputStyle}
            />
          ) : (
            <textarea className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
              value={String(value ?? '')}
              rows={String(value).length > 80 ? 4 : 2}
              onChange={(e) => updateNodeParam(node.id, key, e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: key === 'template' ? 'monospace' : 'inherit' }}
            />
          )}
        </div>
      ))}

      {/* Execution results for this node */}
      {executionStatus !== 'idle' && (
        <div style={{ marginTop: '8px' }}>
          {executionResults
            .filter((r) => r.nodeId === node.id)
            .map((r) => (
              <div
                key={r.nodeId}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md, 8px)',
                  background: r.error ? 'var(--error-bg)' : 'var(--surface-elevated)',
                  border: `1px solid ${r.error ? 'var(--error)' : 'var(--border)'}`,
                  fontSize: '13px',
                  color: r.error ? 'var(--error)' : 'var(--text)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {r.error ?? r.output}
              </div>
            ))}
          {executionError && (
            <div
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--error-bg)',
                border: '1px solid var(--error)',
                fontSize: '13px',
                color: 'var(--error)',
              }}
            >
              {executionError}
            </div>
          )}
          <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500" onClick={resetExecution} style={{ marginTop: '8px', ...ghostButtonStyle }}>
            ↺ Reset
          </button>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text)',
  padding: '6px 10px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
}

const ghostButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-secondary)',
  padding: '4px 10px',
  fontSize: '12px',
  cursor: 'pointer',
}
