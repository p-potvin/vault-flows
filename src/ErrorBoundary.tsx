import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[vault-flows] render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{
          padding: '24px',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#e05c4a',
          background: '#1c2226',
          margin: 0,
          minHeight: '100vh',
          whiteSpace: 'pre-wrap',
        }}>
          {'[vault-flows] render crash\n\n'}
          {this.state.error.message}
          {'\n\n'}
          {this.state.error.stack}
        </pre>
      )
    }
    return this.props.children
  }
}
