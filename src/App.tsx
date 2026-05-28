import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Workflow, ArrowRight, PanelRightClose, PanelRightOpen } from 'lucide-react'

import { FlowCanvas } from '@/canvas/FlowCanvas'
import { WorkflowLibrary } from '@/ui/WorkflowLibrary'
import { NodeParamPanel } from '@/ui/NodeParamPanel'
import { LoginModal } from '@/ui/LoginModal'
import { SignupModal } from '@/ui/SignupModal'
import { ExecutionProgressOverlay } from '@/ui/ExecutionProgressOverlay'
import { AppShell } from '@/ui/AppShell'
import { Navbar } from '@/ui/Navbar'
import { Footer } from '@/ui/Footer'
import { Button } from '@/ui/components/Button'
import { ToastHost, pushToast } from '@/ui/components/Toast'

import { useFlowStore } from '@/store/flowStore'
import { runFlow } from '@/execution/runner'
import { getToken, clearToken, getMe } from '@/api/client'

export default function App() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [paramPanelOpen, setParamPanelOpen] = useState(false)  // hidden by default — advanced view
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null)
  const [runAfterLogin, setRunAfterLogin] = useState(false)
  const toFlow = useFlowStore((s) => s.toFlow)
  const setExecutionStatus = useFlowStore((s) => s.setExecutionStatus)
  const setExecutionResults = useFlowStore((s) => s.setExecutionResults)
  const setExecutionError = useFlowStore((s) => s.setExecutionError)
  const executionStatus = useFlowStore((s) => s.executionStatus)
  const activePreset = useFlowStore((s) => s.activePreset)

  // On mount: if a JWT is in sessionStorage, validate it via /auth/me and
  // rehydrate the username chip. Stale/expired tokens are cleared so the
  // header shows "Login" rather than a phantom user.
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    void getMe()
      .then((me) => {
        if (!cancelled) setCurrentUser(me.username)
      })
      .catch(() => {
        if (!cancelled) {
          clearToken()
          setCurrentUser(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function executeFlow() {
    setExecutionStatus('running')
    setExecutionError(null)
    try {
      const results = await runFlow(toFlow())
      setExecutionResults(results)
      // Per-node errors are non-fatal at the runner level — surface them
      const nodeErrors = results.filter((r) => r.error)
      if (nodeErrors.length > 0) {
        setExecutionStatus('error')
        const first = nodeErrors[0]
        const detail = first.error?.length && first.error.length > 120
          ? first.error.slice(0, 120) + '…'
          : first.error
        pushToast('error', `Workflow failed at node ${first.nodeId}: ${detail}`)
        // Auto-open the inspector so the user sees the full error
        setParamPanelOpen(true)
      } else {
        setExecutionStatus('done')
        pushToast('success', 'Workflow finished successfully.', 4000)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setExecutionError(msg)
      setExecutionStatus('error')
      pushToast('error', `Run failed: ${msg.length > 140 ? msg.slice(0, 140) + '…' : msg}`)
      setParamPanelOpen(true)
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

  function handleLogout() {
    clearToken()
    setCurrentUser(null)
  }

  return (
    <AppShell>
      <Navbar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onRun={handleRun}
        onLogin={() => {
          setRunAfterLogin(false)
          setAuthModal('login')
        }}
        onLogout={currentUser ? handleLogout : undefined}
        runDisabled={executionStatus === 'running' || !activePreset}
        running={executionStatus === 'running'}
        activeWorkflowName={activePreset?.name ?? null}
        currentUser={currentUser}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — Warm panel (workflow catalog = "archive" surface).
         * Keyed on currentUser so a fresh login auto-refreshes the catalog
         * instead of requiring a page reload. */}
        {sidebarOpen && (
          <aside className="vw-warm-shell w-80 flex-shrink-0 overflow-y-auto border-r border-vw-console-border">
            <div className="border-b border-vw-warm-border bg-vw-warm-bg/80 px-4 py-3 backdrop-blur-sm">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-vw-warm-ink/60">
                {t('workflow.library', { defaultValue: 'Workflow Library' })}
              </h2>
            </div>
            <WorkflowLibrary
              key={currentUser ?? 'guest'}
              onWorkflowLoaded={() => setSidebarOpen(false)}
            />
          </aside>
        )}

        {/* Main canvas — Console surface */}
        <main className="relative flex-1 overflow-hidden">
          {activePreset ? (
            <FlowCanvas key={activePreset?.id} />
          ) : (
            <EmptyState onOpenLibrary={() => setSidebarOpen(true)} />
          )}

          {/* Inspector toggle — floating button on the right edge */}
          {activePreset && (
            <button
              type="button"
              onClick={() => setParamPanelOpen((v) => !v)}
              title={paramPanelOpen ? 'Hide inspector' : 'Show inspector'}
              className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-lg border border-vw-console-border bg-vw-console-surface/85 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/65 backdrop-blur-md transition-colors hover:text-vw-console-gold"
            >
              {paramPanelOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5" />
              )}
              {paramPanelOpen ? 'Hide params' : 'Params'}
            </button>
          )}
        </main>

        {/* Right panel — Node inspector. Hidden by default; node-level inline
         * params handle the common case, this panel is the advanced view. */}
        {activePreset && paramPanelOpen && (
          <aside className="w-80 flex-shrink-0 overflow-y-auto border-l border-vw-console-border bg-vw-console-surface/60 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-vw-console-border bg-vw-console-surface/95 px-4 py-3">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/55">
                {t('node.params', { defaultValue: 'Node Inspector' })}
              </h2>
              <button
                type="button"
                onClick={() => setParamPanelOpen(false)}
                title="Close inspector"
                className="text-white/45 transition-colors hover:text-vw-console-gold"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <NodeParamPanel />
          </aside>
        )}
      </div>

      <Footer />

      {/* Live progress overlay */}
      <ExecutionProgressOverlay active={executionStatus === 'running'} />

      {/* Floating toast stack — push from anywhere via pushToast() */}
      <ToastHost />

      {/* Auth modals */}
      {authModal === 'login' && (
        <LoginModal
          runIntent={runAfterLogin}
          onSuccess={handleAuthSuccess}
          onSwitchToSignup={() => setAuthModal('signup')}
          onCancel={() => {
            setAuthModal(null)
            setRunAfterLogin(false)
          }}
        />
      )}
      {authModal === 'signup' && (
        <SignupModal
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthModal('login')}
          onCancel={() => {
            setAuthModal(null)
            setRunAfterLogin(false)
          }}
        />
      )}
    </AppShell>
  )
}

function EmptyState({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="rounded-full border border-vw-console-violet/20 bg-vw-console-raised/40 p-5">
        <Workflow className="h-10 w-10 text-vw-console-violet" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-sans text-xl font-semibold text-white">
          {t('app.title', { defaultValue: 'vault-flows' })}
        </h1>
        <p className="font-sans text-sm text-white/55">
          {t('app.tagline', {
            defaultValue: 'Pick a workflow from the library to begin.',
          })}
        </p>
      </div>
      <Button
        variant="primary"
        size="md"
        rightIcon={<ArrowRight className="h-4 w-4" />}
        onClick={onOpenLibrary}
      >
        {t('workflow.browse', { defaultValue: 'Browse workflows' })}
      </Button>
    </div>
  )
}
