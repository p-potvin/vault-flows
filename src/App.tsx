import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlowCanvas } from '@/canvas/FlowCanvas'
import { PresetLibrary } from '@/ui/PresetLibrary'
import { NodeParamPanel } from '@/ui/NodeParamPanel'
import { ThemePicker } from '@/ui/ThemePicker'
import { LoginModal } from '@/ui/LoginModal'
import { SignupModal } from '@/ui/SignupModal'
import { useFlowStore } from '@/store/flowStore'
import { runFlow } from '@/execution/runner'
import { getToken } from '@/api/client'
import i18n from '@/i18n/index'

export default function App() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null)
  const [runAfterLogin, setRunAfterLogin] = useState(false)
  const toFlow = useFlowStore((s) => s.toFlow)
  const setExecutionStatus = useFlowStore((s) => s.setExecutionStatus)
  const setExecutionResults = useFlowStore((s) => s.setExecutionResults)
  const setExecutionError = useFlowStore((s) => s.setExecutionError)
  const executionStatus = useFlowStore((s) => s.executionStatus)
  const activePreset = useFlowStore((s) => s.activePreset)

  async function executeFlow() {
    setExecutionStatus('running')
    setExecutionError(null)
    try {
      const results = await runFlow(toFlow())
      setExecutionResults(results)
      setExecutionStatus('done')
    } catch (err) {
      setExecutionError(err instanceof Error ? err.message : String(err))
      setExecutionStatus('error')
    }
  }

  function handleRun() {
    if (!getToken()) {
      setRunAfterLogin(true)
      setAuthModal('login')
      return
    }
    void executeFlow()
  }

  function handleAuthSuccess(username: string) {
    setCurrentUser(username)
    setAuthModal(null)
    if (runAfterLogin) {
      setRunAfterLogin(false)
      void executeFlow()
    }
  }

  function toggleLang() {
    const next = i18n.language?.startsWith('fr') ? 'en' : 'fr'
    void i18n.changeLanguage(next)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--background)',
        color: 'var(--text)',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 16px',
          height: '48px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        {/* Brand */}
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)', letterSpacing: '-0.01em' }}>
          vault-flows
        </span>

        {/* Preset toggle */}
        <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500" onClick={() => setSidebarOpen((v) => !v)} style={headerBtnStyle}>
          {t('nav.presets')}
        </button>

        <div style={{ flex: 1 }} />

        {/* Active preset label */}
        {activePreset && (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activePreset.name}
          </span>
        )}

        {/* Execute */}
        <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
          onClick={handleRun}
          disabled={executionStatus === 'running' || !activePreset}
          style={{
            ...headerBtnStyle,
            background: executionStatus === 'running' ? 'var(--surface-elevated)' : 'var(--accent)',
            color: executionStatus === 'running' ? 'var(--text-secondary)' : 'var(--text-inverse)',
            fontWeight: 600,
            opacity: !activePreset ? 0.4 : 1,
            cursor: !activePreset ? 'not-allowed' : 'pointer',
          }}
        >
          {executionStatus === 'running' ? t('execution.running') : t('execution.run')}
        </button>

        {/* Auth */}
        {currentUser ? (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md, 8px)',
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={t('auth.logged_in_as', { user: currentUser })}
          >
            {currentUser}
          </span>
        ) : (
          <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500" onClick={() => { setRunAfterLogin(false); setAuthModal('login') }} style={headerBtnStyle}>
            {t('auth.login')}
          </button>
        )}

        {/* Language toggle */}
        <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500" onClick={toggleLang} style={headerBtnStyle}>
          {i18n.language?.startsWith('fr') ? 'EN' : 'FR'}
        </button>

        {/* Theme picker */}
        <ThemePicker />
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — preset library */}
        {sidebarOpen && (
          <aside
            style={{
              width: '280px',
              flexShrink: 0,
              borderRight: '1px solid var(--border)',
              background: 'var(--surface)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('preset.library')}
            </div>
            <PresetLibrary onPresetLoaded={() => setSidebarOpen(false)} />
          </aside>
        )}

        {/* Canvas */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {activePreset ? (
            <FlowCanvas key={activePreset?.id} />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '12px',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ fontSize: '32px' }}>⬡</span>
              <span style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text)' }}>
                {t('app.title')}
              </span>
              <span style={{ fontSize: '14px' }}>{t('app.tagline')}</span>
              <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
                onClick={() => setSidebarOpen(true)}
                style={{
                  marginTop: '8px',
                  padding: '8px 20px',
                  background: 'var(--accent)',
                  color: 'var(--text-inverse)',
                  border: 'none',
                  borderRadius: 'var(--radius-md, 8px)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {t('preset.library')}
              </button>
            </div>
          )}
        </main>

        {/* Right panel — node params */}
        {activePreset && (
          <aside
            style={{
              width: '260px',
              flexShrink: 0,
              borderLeft: '1px solid var(--border)',
              background: 'var(--surface)',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--text-secondary)',
                borderBottom: '1px solid var(--border)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('node.params')}
            </div>
            <NodeParamPanel />
          </aside>
        )}
      </div>

      {/* Auth modals */}
      {authModal === 'login' && (
        <LoginModal
          runIntent={runAfterLogin}
          onSuccess={handleAuthSuccess}
          onSwitchToSignup={() => setAuthModal('signup')}
          onCancel={() => { setAuthModal(null); setRunAfterLogin(false) }}
        />
      )}
      {authModal === 'signup' && (
        <SignupModal
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthModal('login')}
          onCancel={() => { setAuthModal(null); setRunAfterLogin(false) }}
        />
      )}
    </div>
  )
}

const headerBtnStyle: React.CSSProperties = {
  padding: '5px 12px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md, 8px)',
  color: 'var(--text)',
  fontSize: '13px',
  cursor: 'pointer',
}
