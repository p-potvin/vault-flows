import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, User, Lock, Mail, AlertCircle, X } from 'lucide-react'

import { Card } from './components/Card'
import { Field, TextInput } from './components/Field'
import { Button } from './components/Button'
import { register } from '@/api/client'

interface SignupModalProps {
  onSuccess: (username: string) => void
  onSwitchToLogin: () => void
  onCancel?: () => void
}

export function SignupModal({ onSuccess, onSwitchToLogin, onCancel }: SignupModalProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
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
      await register(username.trim(), password, email.trim() || undefined)
      onSuccess(username.trim())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('409') || msg.includes('taken') || msg.includes('exists')) {
        setError(t('auth.error_username_taken', { defaultValue: 'Username is already taken.' }))
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        setError(t('auth.error_network', { defaultValue: 'Network unreachable. Try again.' }))
      } else {
        setError(t('auth.error_signup', { defaultValue: 'Sign-up failed. Try again.' }))
      }
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
              <div className="rounded-lg border border-vw-console-violet/20 bg-vw-console-violet/10 p-1.5">
                <UserPlus className="h-4 w-4 text-vw-console-violet" />
              </div>
              <h2 className="font-sans text-lg font-semibold tracking-tight text-white">
                {t('auth.signup_title', { defaultValue: 'Create an account' })}
              </h2>
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="pl-9"
                />
              </div>
            </Field>

            <Field
              label={t('auth.email', { defaultValue: 'Email' })}
              hint={t('auth.optional', { defaultValue: 'optional' })}
            >
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                <TextInput
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@example.com"
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
                  ? t('auth.creating', { defaultValue: 'Creating…' })
                  : t('auth.signup_submit', { defaultValue: 'Sign up' })}
              </Button>
            </div>
          </form>

          <p className="text-center font-sans text-xs text-white/55">
            {t('auth.have_account', { defaultValue: 'Already have an account?' })}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-mono text-[11px] font-bold uppercase tracking-wider text-vw-console-gold transition-colors hover:text-vw-signal-warning"
            >
              {t('auth.login', { defaultValue: 'Log in' })}
            </button>
          </p>
        </div>
      </Card>
    </div>
  )
}
