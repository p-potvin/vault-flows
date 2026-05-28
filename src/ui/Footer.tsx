import { Activity } from 'lucide-react'
import { LED } from './components/LED'

/**
 * Minimal status-bar footer — single line at the bottom of the shell.
 * Mirrors the "operator station" feel of vault-explorer; lists product
 * name + version + an online LED to signal the back-end is reachable.
 */
export function Footer() {
  return (
    <footer className="border-t border-vw-console-border bg-vw-console-surface/80 px-4 py-2 backdrop-blur-md lg:px-6">
      <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-wider text-white/40">
        <div className="flex items-center gap-3">
          <LED color="online" size={6} title="API connected" />
          <span>vault-flows</span>
          <span className="text-white/25">·</span>
          <span>vaultwares</span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Activity className="h-3 w-3" />
          <span>operational</span>
        </div>
      </div>
    </footer>
  )
}
