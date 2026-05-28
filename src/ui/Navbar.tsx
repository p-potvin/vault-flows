import { useTranslation } from 'react-i18next'
import {
  Workflow,
  Play,
  LogIn,
  LogOut,
  User,
  Globe,
  Loader2,
  Hexagon,
} from 'lucide-react'
import { Button } from './components/Button'
import { LED } from './components/LED'
import i18n from '@/i18n/index'

interface NavbarProps {
  onToggleSidebar: () => void
  onRun: () => void
  onLogin: () => void
  onLogout?: () => void
  runDisabled: boolean
  running: boolean
  activeWorkflowName?: string | null
  currentUser?: string | null
}

/**
 * vaultwares-revisited app header. Sticky, glassmorphic, terminal-feel.
 *   - Left:   brand + Workflows toggle
 *   - Center: active workflow chip (when one is loaded)
 *   - Right:  Run button, auth chip, language toggle
 */
export function Navbar({
  onToggleSidebar,
  onRun,
  onLogin,
  onLogout,
  runDisabled,
  running,
  activeWorkflowName,
  currentUser,
}: NavbarProps) {
  const { t } = useTranslation()

  function toggleLang() {
    const next = i18n.language?.startsWith('fr') ? 'en' : 'fr'
    void i18n.changeLanguage(next)
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-vw-console-border bg-vw-console-surface/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <Hexagon
            className="h-6 w-6 text-vw-console-gold"
            strokeWidth={1.5}
          />
          <span className="font-sans text-base font-semibold tracking-tight text-white">
            vault<span className="text-vw-console-gold">flows</span>
          </span>
        </div>

        {/* Workflows toggle */}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Workflow className="h-3.5 w-3.5" />}
          onClick={onToggleSidebar}
        >
          {t('nav.workflows', { defaultValue: 'Workflows' })}
        </Button>

        {/* Active workflow chip */}
        {activeWorkflowName && (
          <div className="hidden items-center gap-2 rounded-full border border-vw-console-violet/20 bg-vw-console-raised/50 px-3 py-1 md:flex">
            <LED color="violet" pulsing={running} size={6} />
            <span className="font-mono text-[11px] text-white/70">
              {activeWorkflowName}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Run */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={
            running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )
          }
          onClick={onRun}
          disabled={runDisabled}
        >
          {running
            ? t('execution.running', { defaultValue: 'Running' })
            : t('execution.run', { defaultValue: 'Run' })}
        </Button>

        {/* Auth */}
        {currentUser ? (
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-vw-console-raised/60 px-2.5 py-1.5">
              <User className="h-3.5 w-3.5 text-vw-console-gold" />
              <span className="font-mono text-[11px] text-white/80">
                {currentUser}
              </span>
            </div>
            {onLogout && (
              <Button
                variant="icon"
                size="sm"
                onClick={onLogout}
                title={t('auth.logout', { defaultValue: 'Log out' })}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<LogIn className="h-3.5 w-3.5" />}
            onClick={onLogin}
          >
            {t('auth.login', { defaultValue: 'Log in' })}
          </Button>
        )}

        {/* Language */}
        <Button
          variant="icon"
          size="sm"
          onClick={toggleLang}
          title={i18n.language?.toUpperCase()}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
            {i18n.language?.startsWith('fr') ? 'FR' : 'EN'}
          </span>
        </Button>
      </div>
    </nav>
  )
}
