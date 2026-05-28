import type { HTMLAttributes, ReactNode } from 'react'

type CardSurface = 'console' | 'warm'
type CardSize = 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: CardSurface
  size?: CardSize       // sm = 12-16px radius for compact lists; lg = 28px hero card
  interactive?: boolean // hover state for clickable cards
  children: ReactNode
}

/**
 * vaultwares-revisited card primitive. Two surfaces:
 *   - 'console' (default): dark, terminal-feel, used for operational panels
 *   - 'warm':              parchment, used for the workflow library / archives
 *
 * Three sizes:
 *   - 'sm': tight list rows (canvas nodes, sidebar items)
 *   - 'md': standard cards
 *   - 'lg': hero cards with full 28px radius
 */
export function Card({
  surface = 'console',
  size = 'md',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const base =
    surface === 'warm'
      ? size === 'sm'
        ? 'vw-warm-card-flat'
        : 'vw-warm-card'
      : size === 'sm'
        ? 'vw-card-flat'
        : 'vw-card'

  const radius = size === 'lg' ? '' : size === 'sm' ? 'rounded-xl' : 'rounded-3xl'
  const hover = interactive
    ? surface === 'warm'
      ? 'transition-colors hover:border-vw-warm-gold/40 cursor-pointer'
      : 'transition-colors hover:border-vw-console-violet/40 hover:bg-vw-console-elevated cursor-pointer'
    : ''

  return (
    <div
      className={[base, radius, hover, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
