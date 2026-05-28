import type { CSSProperties } from 'react'

export type LEDColor = 'online' | 'relay' | 'sync' | 'warning' | 'alert' | 'gold' | 'violet' | 'muted'

const COLOR_MAP: Record<LEDColor, string> = {
  online:  'var(--vault-signal-online)',
  relay:   'var(--vault-signal-relay)',
  sync:    'var(--vault-signal-sync)',
  warning: 'var(--vault-signal-warning)',
  alert:   'var(--vault-signal-alert)',
  gold:    'var(--vault-console-gold)',
  violet:  'var(--vault-console-violet)',
  muted:   'rgba(255,255,255,0.35)',
}

interface LEDProps {
  color?: LEDColor
  pulsing?: boolean
  size?: number
  title?: string
  className?: string
}

/**
 * A small colored dot used to indicate live state. Pulses slowly by default;
 * pass `pulsing={false}` for a static indicator (e.g. a card-corner status
 * marker that shouldn't draw attention to itself).
 */
export function LED({ color = 'online', pulsing = true, size = 8, title, className }: LEDProps) {
  const c = COLOR_MAP[color]
  const style: CSSProperties = {
    width: size,
    height: size,
    color: c,
    background: c,
  }
  return (
    <span
      role={title ? 'status' : undefined}
      aria-label={title}
      title={title}
      className={(pulsing ? 'vw-led' : 'vw-led-static') + (className ? ' ' + className : '')}
      style={style}
    />
  )
}
