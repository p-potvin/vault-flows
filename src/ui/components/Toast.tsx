import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export type ToastKind = 'error' | 'success' | 'info'

interface ToastEvent {
  id: string
  kind: ToastKind
  message: string
  timeoutMs?: number
}

// Module-level event hub — any code can `pushToast(...)` from anywhere
// without threading a context. Subscribers re-render the host.
type Listener = (toasts: ToastEvent[]) => void
let _toasts: ToastEvent[] = []
const _listeners: Set<Listener> = new Set()

function notify() {
  for (const l of _listeners) l(_toasts)
}

export function pushToast(kind: ToastKind, message: string, timeoutMs = 6000): string {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  _toasts = [..._toasts, { id, kind, message, timeoutMs }]
  notify()
  if (timeoutMs > 0) {
    window.setTimeout(() => dismissToast(id), timeoutMs)
  }
  return id
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id)
  notify()
}

/**
 * Mount once at the app root. Renders the floating stack in the top-right.
 * Call `pushToast(kind, message)` from anywhere in the app.
 */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastEvent[]>(_toasts)
  useEffect(() => {
    _listeners.add(setToasts)
    return () => {
      _listeners.delete(setToasts)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-[1100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  )
}

function ToastCard({ toast }: { toast: ToastEvent }) {
  const tone: Record<ToastKind, { icon: ReactNode; border: string; bg: string; color: string }> = {
    error: {
      icon: <AlertCircle className="h-4 w-4" />,
      border: 'border-vw-signal-alert/30',
      bg: 'bg-vw-signal-alert/10',
      color: 'text-vw-signal-alert',
    },
    success: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      border: 'border-vw-signal-online/30',
      bg: 'bg-vw-signal-online/10',
      color: 'text-vw-signal-online',
    },
    info: {
      icon: <Info className="h-4 w-4" />,
      border: 'border-vw-copper/30',
      bg: 'bg-vw-copper/10',
      color: 'text-vw-copper',
    },
  }
  const t = tone[toast.kind]

  return (
    <div
      className={[
        'pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-vw-console-surface/95 px-3.5 py-3 shadow-2xl backdrop-blur-md',
        t.border,
      ].join(' ')}
    >
      <span className={['mt-0.5 flex-shrink-0', t.color].join(' ')}>{t.icon}</span>
      <span className="flex-1 font-sans text-xs leading-snug text-white/90">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="flex-shrink-0 text-white/40 transition-colors hover:text-white"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
