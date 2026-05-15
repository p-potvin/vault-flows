import { THEMES } from '../../vault-themes/theme-manager/exports/theme-manager'
import { applyTheme } from '@/lib/theme'

export function ThemePicker() {
  const current = localStorage.getItem('vw-theme-id') ?? THEMES[0].id

  return (
    <select
      value={current}
      onChange={(e) => {
        const theme = THEMES.find((t) => t.id === e.target.value)
        if (theme) applyTheme(theme)
        // force re-render
        window.dispatchEvent(new Event('vault-theme-change'))
      }}
      style={{
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '4px 8px',
        fontSize: '13px',
        cursor: 'pointer',
      }}
    >
      {THEMES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}
