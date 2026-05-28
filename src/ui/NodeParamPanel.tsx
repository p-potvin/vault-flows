import { useTranslation } from 'react-i18next'
import { RotateCcw, AlertCircle } from 'lucide-react'

import { useFlowStore } from '@/store/flowStore'
import { Field, TextInput, TextArea } from './components/Field'
import { Button } from './components/Button'
import { LED } from './components/LED'
import { ComfyUIWorkflowInputsEditor } from './ComfyUIWorkflowInputsEditor'

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
      <div className="px-4 py-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          {t('node.params_hint', { defaultValue: 'Select a node to inspect' })}
        </p>
      </div>
    )
  }

  const ledColor =
    node.type === 'image_input' || node.type === 'input'
      ? 'gold'
      : node.type === 'comfyui_workflow' || node.type === 'model_call' || node.type === 'llm'
        ? 'violet'
        : node.type === 'display' || node.type === 'output'
          ? 'online'
          : 'relay'

  // Per-node error (most-recent execution); always shown at the top when present
  const thisNodeResult = executionResults.find((r) => r.nodeId === node.id)
  const errorBanner = executionError || thisNodeResult?.error || null

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Top-of-panel error banner — moved here so failures are impossible to miss */}
      {errorBanner && (
        <div className="rounded-lg border border-vw-signal-alert/30 bg-vw-signal-alert/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-vw-signal-alert" />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-vw-signal-alert">
                Execution failed
              </span>
              <span className="whitespace-pre-wrap font-sans text-xs text-vw-signal-alert/90">
                {errorBanner}
              </span>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="h-3 w-3" />}
                onClick={resetExecution}
                className="self-start"
              >
                {t('execution.reset', { defaultValue: 'Reset' })}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <LED color={ledColor as never} size={9} pulsing={executionStatus === 'running'} />
        <span className="font-sans text-sm font-semibold text-white">
          {(typeof node.params._displayName === 'string' && node.params._displayName) || node.label}
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-white/35">
          {node.type}
        </span>
      </div>

      {/* Type-specific or generic body */}
      {node.type === 'comfyui_workflow' ? (
        <ComfyUIWorkflowInputsEditor node={node} />
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(node.params)
            .filter(([key]) => !key.startsWith('_'))
            .map(([key, value]) => (
              <Field key={key} label={t(`node.${key}`, { defaultValue: key })}>
                {typeof value === 'number' ? (
                  <TextInput
                    type="number"
                    value={value}
                    step={key === 'temperature' ? 0.1 : 1}
                    min={0}
                    max={key === 'temperature' ? 2 : undefined}
                    onChange={(e) => updateNodeParam(node.id, key, parseFloat(e.target.value))}
                  />
                ) : (
                  <TextArea
                    value={String(value ?? '')}
                    rows={String(value).length > 80 ? 4 : 2}
                    onChange={(e) => updateNodeParam(node.id, key, e.target.value)}
                    className={key === 'template' ? 'font-mono' : ''}
                  />
                )}
              </Field>
            ))}
        </div>
      )}

      {/* Per-node successful output (text, json, file) — image results render
       * inline ON the node itself; nothing extra needed here for them. */}
      {executionStatus !== 'idle' && thisNodeResult && !thisNodeResult.error && thisNodeResult.kind !== 'image' && (
        <div className="rounded-lg border border-vw-console-border bg-vw-console-bg/60 p-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/45">
            Output
          </span>
          <p className="mt-1 whitespace-pre-wrap font-sans text-xs text-white/85">
            {thisNodeResult.output}
          </p>
        </div>
      )}
    </div>
  )
}
