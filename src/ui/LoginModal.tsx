import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LogIn, User, Lock, AlertCircle, X } from 'lucide-react'

import { Card } from './components/Card'
import { Field, TextInput } from './components/Field'
import { Button } from './components/Button'
import { login } from '@/api/client'

interface LoginModalProps {
  onSuccess: (username: string) => void
  onSwitchToSignup?: () => void
  onCancel?: () => void
  /** If true, the user explicitly clicked Run Flow — show a hint */
  runIntent?: boolean
}

export function LoginModal({ onSuccess, onSwitchToSignup, onCancel, runIntent }: LoginModalProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
      onSuccess(username.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isNetwork = msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
      setError(
        isNetwork
          ? t('auth.error_network', { defaultValue: 'Network unreachable. Try again.' })
          : t('auth.error_invalid', { defaultValue: 'Invalid username or password.' }),
      )
    } finally {
      setLoading(false)
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel?.()
  }

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-vw-console-bg/75 backdrop-blur-md"
    >
      <Card size="lg" className="w-full max-w-sm shadow-2xl">
        <div className="flex flex-col gap-5 p-7">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg border border-vw-console-gold/20 bg-vw-console-gold/10 p-1.5">
                <LogIn className="h-4 w-4 text-vw-console-gold" />
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="font-sans text-lg font-semibold tracking-tight text-white">
                  {t('auth.login', { defaultValue: 'Log in' })}
                </h2>
                {runIntent && (
                  <p className="font-mono text-[10px] uppercase tracking-wider text-vw-console-gold/80">
                    {t('auth.login_required', { defaultValue: 'Required to run a workflow' })}
                  </p>
                )}
              </div>
            </div>
            {onCancel && (
              <Button variant="icon" size="sm" onClick={onCancel} title="Cancel">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <Field label={t('auth.username', { defaultValue: 'Username' })} required>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <TextInput
                  ref={usernameRef as React.Ref<HTMLInputElement>}
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label={t('auth.password', { defaultValue: 'Password' })} required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <TextInput
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="pl-9"
                />
              </div>
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-vw-signal-alert/30 bg-vw-signal-alert/10 px-3 py-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-vw-signal-alert" />
                <span className="font-sans text-xs text-vw-signal-alert">{error}</span>
              </div>
            )}

            <div className="mt-1 flex gap-2.5">
              {onCancel && (
                <Button variant="secondary" size="md" onClick={onCancel} disabled={loading}>
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                buttonType="submit"
                disabled={loading || !username || !password}
                fullWidth
              >
                {loading
                  ? t('auth.signing_in', { defaultValue: 'Signing in…' })
                  : t('auth.submit', { defaultValue: 'Log in' })}
              </Button>
            </div>
          </form>

          {onSwitchToSignup && (
            <p className="text-center font-sans text-xs text-white/55">
              {t('auth.no_account', { defaultValue: "Don't have an account?" })}{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-mono text-[11px] font-bold uppercase tracking-wider text-vw-console-gold transition-colors hover:text-vw-signal-warning"
              >
                {t('auth.sign_up', { defaultValue: 'Sign up' })}
              </button>
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
