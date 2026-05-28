import type { ReactNode } from 'react'

type Tone = 'neutral' | 'gold' | 'violet' | 'online' | 'relay' | 'warning' | 'alert' | 'muted'
type Surface = 'console' | 'warm'

interface BadgeProps {
  tone?: Tone
  surface?: Surface
  icon?: ReactNode
  className?: string
  children: ReactNode
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'text-white/80 border-white/10',
  gold:    'text-vw-console-gold border-vw-console-gold/30',
  violet:  'text-vw-console-violet border-vw-console-violet/30',
  online:  'text-vw-signal-online border-vw-signal-online/30',
  relay:   'text-vw-signal-relay border-vw-signal-relay/30',
  warning: 'text-vw-signal-warning border-vw-signal-warning/30',
  alert:   'text-vw-signal-alert border-vw-signal-alert/30',
  muted:   'text-white/40 border-white/5',
}

const TONE_WARM_CLASSES: Record<Tone, string> = {
  neutral: 'text-vw-warm-ink/80 border-vw-warm-ink/10',
  gold:    'text-vw-warm-gold border-vw-warm-gold/30',
  violet:  'text-vw-console-violet border-vw-console-violet/30',
  online:  'text-vw-signal-online border-vw-signal-online/40',
  relay:   'text-vw-signal-relay border-vw-signal-relay/40',
  warning: 'text-vw-signal-warning border-vw-signal-warning/40',
  alert:   'text-vw-signal-alert border-vw-signal-alert/40',
  muted:   'text-vw-warm-ink/40 border-vw-warm-ink/5',
}

/**
 * Small uppercase mono pill — used for categories, status flags, model labels.
 * The icon slot accepts any ReactNode (typically a small Lucide icon).
 */
export function Badge({ tone = 'neutral', surface = 'console', icon, className, children }: BadgeProps) {
  const palette = surface === 'warm' ? TONE_WARM_CLASSES : TONE_CLASSES
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'font-mono text-[10px] font-bold uppercase tracking-wider',
        palette[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
      {children}
    </span>
  )
}
