import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Image as ImageIcon,
  Video as VideoIcon,
  Folder,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

import {
  listPipelinesWorkflows,
  listWorkflowValidations,
  type PipelinesWorkflow,
  type WorkflowVerdict,
} from '@/api/client'
import { useFlowStore } from '@/store/flowStore'
import { Card } from './components/Card'
import { Badge } from './components/Badge'
import { LED } from './components/LED'

interface WorkflowLibraryProps {
  onWorkflowLoaded: () => void
}

interface VerdictMeta {
  ledColor: 'online' | 'warning' | 'relay' | 'alert' | 'muted'
  label: string
  severity: 0 | 1 | 2
  Icon: typeof CheckCircle2
}

const VERDICT_META: Record<WorkflowVerdict, VerdictMeta> = {
  pass:                  { ledColor: 'online',  label: 'Ready',         severity: 0, Icon: CheckCircle2 },
  broken_wiring:         { ledColor: 'warning', label: 'Wiring',        severity: 1, Icon: AlertTriangle },
  blocked_subgraph:      { ledColor: 'relay',   label: 'Subgraph',      severity: 1, Icon: AlertCircle },
  blocked_missing_model: { ledColor: 'alert',   label: 'Model missing', severity: 2, Icon: XCircle },
  blocked_unknown_pack:  { ledColor: 'muted',   label: 'Pack missing',  severity: 2, Icon: XCircle },
  empty:                 { ledColor: 'muted',   label: 'Empty',         severity: 2, Icon: XCircle },
}

const CATEGORY_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: VideoIcon,
}

export function WorkflowLibrary({ onWorkflowLoaded }: WorkflowLibraryProps) {
  const { t } = useTranslation()
  const setPipelinesWorkflows = useFlowStore((s) => s.setPipelinesWorkflows)
  const loadFromComfyWorkflow = useFlowStore((s) => s.loadFromComfyWorkflow)

  const [workflows, setWorkflows] = useState<PipelinesWorkflow[]>([])
  const [verdicts, setVerdicts] = useState<Record<string, { verdict: WorkflowVerdict; summary: string }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [showBroken, setShowBroken] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([listPipelinesWorkflows(), listWorkflowValidations().catch(() => null)])
      .then(([wfs, validation]) => {
        if (cancelled) return
        const sorted = [...wfs].sort((a, b) => a.name.localeCompare(b.name))
        setWorkflows(sorted)
        setPipelinesWorkflows(sorted)
        if (validation) {
          const map: Record<string, { verdict: WorkflowVerdict; summary: string }> = {}
          for (const r of validation.results) {
            map[r.workflow_id] = { verdict: r.verdict, summary: r.summary }
          }
          setVerdicts(map)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setPipelinesWorkflows])

  const categories = useMemo(() => {
    const cats = new Set<string>(workflows.map((w) => (w.category || 'other').toLowerCase()))
    return ['all', ...Array.from(cats).sort()]
  }, [workflows])

  const visible = useMemo(() => {
    let list = workflows
    if (activeCategory !== 'all') {
      list = list.filter((w) => (w.category || 'other').toLowerCase() === activeCategory)
    }
    if (!showBroken) {
      list = list.filter((w) => {
        const v = verdicts[w.id]
        return !v || v.verdict === 'pass'
      })
    }
    return list
  }, [workflows, activeCategory, showBroken, verdicts])

  const brokenCount = useMemo(
    () => workflows.filter((w) => verdicts[w.id] && verdicts[w.id].verdict !== 'pass').length,
    [workflows, verdicts],
  )

  function inputCount(wf: PipelinesWorkflow): number {
    const step = (wf.steps ?? []).find((s) => s?.kind === 'comfyui_graph')
    return Object.keys(step?.input_paths ?? {}).length
  }

  return (
    <div className="flex h-full flex-col">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-vw-warm-border px-4 py-3">
        {categories.map((c) => {
          const active = activeCategory === c
          return (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={[
                'rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors',
                active
                  ? 'border-vw-warm-gold bg-vw-warm-gold text-vw-warm-bg'
                  : 'border-vw-warm-border bg-transparent text-vw-warm-ink/55 hover:text-vw-warm-ink',
              ].join(' ')}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Show-broken toggle */}
      {brokenCount > 0 && (
        <label className="flex cursor-pointer select-none items-center gap-2 border-b border-vw-warm-border px-4 py-2">
          <input
            type="checkbox"
            checked={showBroken}
            onChange={(e) => setShowBroken(e.target.checked)}
            className="h-3.5 w-3.5 accent-vw-warm-gold"
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-vw-warm-ink/55">
            {t('workflow.show_broken', {
              defaultValue: `Show ${brokenCount} broken`,
              count: brokenCount,
            })}
          </span>
        </label>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-vw-warm-ink/45">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {t('workflow.loading', { defaultValue: 'Loading…' })}
            </span>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-vw-signal-alert/30 bg-vw-signal-alert/5 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-vw-signal-alert" />
            <span className="font-sans text-xs text-vw-signal-alert">{error}</span>
          </div>
        )}
        {!loading && !error && visible.length === 0 && (
          <p className="py-8 text-center font-sans text-xs text-vw-warm-ink/45">
            {t('workflow.empty', { defaultValue: 'No workflows in this category.' })}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {visible.map((wf) => {
            const cat = (wf.category || 'other').toLowerCase()
            const Icon = CATEGORY_ICONS[cat] || Folder
            const ic = inputCount(wf)
            const v = verdicts[wf.id]
            const meta = v ? VERDICT_META[v.verdict] : null

            return (
              <Card
                key={wf.id}
                surface="warm"
                size="sm"
                interactive
                onClick={() => {
                  loadFromComfyWorkflow(wf)
                  onWorkflowLoaded()
                }}
                title={v ? `${meta?.label}: ${v.summary}` : undefined}
                className={meta && meta.severity === 2 ? 'opacity-60' : ''}
              >
                <div className="flex flex-col gap-2 p-3">
                  <div className="flex items-start gap-2">
                    {meta && (
                      <LED
                        color={meta.ledColor}
                        size={7}
                        pulsing={v?.verdict === 'pass'}
                        className="mt-1.5 flex-shrink-0"
                      />
                    )}
                    <h3 className="flex-1 font-sans text-[13px] font-semibold leading-snug text-vw-warm-ink">
                      {wf.name}
                    </h3>
                  </div>

                  {wf.description && (
                    <p
                      className="line-clamp-2 font-sans text-[11px] leading-snug text-vw-warm-ink/55"
                      title={wf.description}
                    >
                      {wf.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="gold" surface="warm" icon={<Icon className="h-2.5 w-2.5" />}>
                      {cat}
                    </Badge>
                    <Badge tone="neutral" surface="warm">
                      {ic} {ic === 1 ? 'input' : 'inputs'}
                    </Badge>
                    {meta && meta.severity !== 0 && (
                      <Badge tone={meta.ledColor === 'muted' ? 'muted' : meta.ledColor as never} surface="warm">
                        {meta.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
