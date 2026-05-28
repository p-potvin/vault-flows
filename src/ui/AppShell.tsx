import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

/**
 * Console-shell root. Applies the radial violet glow + linear gradient
 * background that defines vaultwares-revisited's operational space.
 * Warm regions (workflow library, etc.) live inside as opt-in `.vw-warm-*`
 * panels rather than as a swappable theme.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="vw-console-shell flex min-h-screen flex-col font-sans text-white selection:bg-vw-console-violet/30">
      {children}
    </div>
  )
}
