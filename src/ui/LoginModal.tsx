import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { login } from '@/api/client'

interface LoginModalProps {
  onSuccess: (username: string) => void
  onCancel?: () => void
  /** If true, the user explicitly clicked Run Flow — show a hint */
  runIntent?: boolean
}

export function LoginModal({ onSuccess, onCancel, runIntent }: LoginModalProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Auto-focus username on open
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
      const isNetworkError = msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')
      setError(isNetworkError ? t('auth.error_network') : t('auth.error_invalid'))
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: '32px',
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>
            {t('auth.login')}
          </span>
          {runIntent && (
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {t('auth.login_required')}
            </span>
          )}
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>{t('auth.username')}</label>
            <input
              ref={usernameRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={labelStyle}>{t('auth.password')}</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'rgba(224,92,74,0.12)',
                border: '1px solid rgba(224,92,74,0.4)',
                color: '#e05c4a',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                flex: 1,
                padding: '9px 16px',
                background: loading ? 'var(--surface-elevated)' : 'var(--accent)',
                color: loading ? 'var(--text-secondary)' : 'var(--text-inverse)',
                border: 'none',
                borderRadius: 'var(--radius-md, 8px)',
                fontWeight: 600,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: (!username || !password) ? 0.5 : 1,
                transition: 'opacity 120ms ease-out',
              }}
            >
              {loading ? t('auth.signing_in') : t('auth.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface-elevated, var(--surface))',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text)',
  padding: '8px 12px',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '9px 16px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  cursor: 'pointer',
}
