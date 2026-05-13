import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/index'
import './index.css'
import App from './App'
import { THEMES, type VaultTheme } from '../vault-themes/theme-manager/exports/theme-manager'

function applyTheme(theme: VaultTheme) {
  const root = document.documentElement
  const skip = new Set(['name', 'id', 'mode'])
  for (const [key, value] of Object.entries(theme)) {
    if (!skip.has(key)) {
      root.style.setProperty(`--${key.replaceAll('_', '-')}`, value as string)
    }
  }
  root.setAttribute('data-mode', theme.mode)
  localStorage.setItem('vw-theme-id', theme.id)
}

const savedThemeId = localStorage.getItem('vw-theme-id')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const fallback = prefersDark
  ? THEMES.find((t) => t.id === 'golden-slate')
  : THEMES.find((t) => t.id === 'codex-solar-light-revisited')
const activeTheme = THEMES.find((t) => t.id === savedThemeId) ?? fallback ?? THEMES[0]
applyTheme(activeTheme)

export { applyTheme }

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
