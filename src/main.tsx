import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/index'
import './index.css'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'

// vaultwares-revisited has no runtime theme switcher — Console + Warm coexist
// by region. Tokens are static CSS vars from vaultwares-themes/assets/tokens.

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
