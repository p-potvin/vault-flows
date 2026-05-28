import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertCircle } from 'lucide-react'

import { cancelJob, getRecentJob, type JobSummary } from '@/api/client'
import { Card } from './components/Card'
import { LED } from './components/LED'
import { Button } from './components/Button'

interface Props {
  active: boolean
  onClosed?: () => void
}

/**
 * Floating progress card shown during a /flows/run that involves a
 * comfyui_workflow node. Polls /jobs/recent every second.
 */
export function ExecutionProgressOverlay({ active, onClosed }: Props) {
  const { t } = useTranslation()
  const [job, setJob] = useState<JobSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [cancelling, setCancelling] = useState(false)

  const startedAt = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    startedAt.current = Date.now()
    setJob(null)
    setError(null)
    setElapsedSec(0)
    setCancelling(false)

    let stopped = false

    const tickHandle = window.setInterval(() => {
      if (startedAt.current !== null) {
        setElapsedSec(Math.floor((Date.now() - startedAt.current) / 1000))
      }
    }, 1000)

    let pollTimer: number | null = null
    const poll = async () => {
      if (stopped) return
      try {
        const j = await getRecentJob({ kind: 'workflow_run' })
        if (!stopped) setJob(j)
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : String(e))
      }
      if (!stopped) pollTimer = window.setTimeout(poll, 1000)
    }
    void poll()

    return () => {
      stopped = true
      window.clearInterval(tickHandle)
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [active])

  if (!active) return null

  async function handleCancel() {
    if (!job?.id || cancelling) return
    setCancelling(true)
    try {
      await cancelJob(job.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCancelling(false)
    }
  }

  const progress = job?.progress ?? {}
  const step = typeof progress.step === 'number' ? progress.step : 0
  const total = typeof progress.total === 'number' ? progress.total : 0
  const pct = total > 0 ? Math.min(100, Math.round((step / total) * 100)) : null
  const nodeId = progress.current_node_id ?? null
  const message =
    progress.message ?? (job ? job.status : t('execution.starting', { defaultValue: 'Starting…' }))
  const finalState = job && (job.status === 'succeeded' || job.status === 'failed' || job.status === 'canceled')

  const ledColor =
    job?.status === 'succeeded' ? 'online'
    : job?.status === 'failed' ? 'alert'
    : job?.status === 'canceled' ? 'muted'
    : 'violet'

  return (
    <Card size="lg" className="fixed bottom-6 right-6 z-[999] w-80 shadow-2xl">
      <div className="flex flex-col gap-3 p-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <LED color={ledColor as never} size={9} pulsing={!finalState} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-vw-console-gold">
            {t('execution.title', { defaultValue: 'Running workflow' })}
          </span>
          <div className="flex-1" />
          <span className="font-mono text-[11px] tabular-nums text-white/55">
            {elapsedSec}s
          </span>
        </div>

        {/* Progress bar */}
        {pct !== null && (
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 bg-vw-console-gold transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* Status text */}
        <div className="flex flex-col gap-1">
          <span className="font-sans text-xs text-white/85">{message}</span>
          {(nodeId !== null || total > 0) && (
            <span className="font-mono text-[10px] uppercase tracking-wider tabular-nums text-white/45">
              {nodeId !== null && <>node {nodeId}</>}
              {nodeId !== null && total > 0 && ' · '}
              {total > 0 && (
                <>
                  {step}/{total} steps{pct !== null && ` (${pct}%)`}
                </>
              )}
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-vw-signal-alert/30 bg-vw-signal-alert/10 px-2.5 py-1.5">
            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-vw-signal-alert" />
            <span className="font-sans text-[11px] text-vw-signal-alert" title={error}>
              {error}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!finalState ? (
            <Button
              variant="danger"
              size="sm"
              fullWidth
              leftIcon={<X className="h-3 w-3" />}
              onClick={() => void handleCancel()}
              disabled={!job?.id || cancelling}
            >
              {cancelling
                ? t('execution.canceling', { defaultValue: 'Canceling…' })
                : t('execution.cancel', { defaultValue: 'Cancel' })}
            </Button>
          ) : (
            <Button variant="primary" size="sm" fullWidth onClick={onClosed}>
              {t('execution.dismiss', { defaultValue: 'Close' })}
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
