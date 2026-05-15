import { useTranslation } from 'react-i18next'
import type { Preset, PresetDomain } from '@/nodes/types'

const DOMAIN_COLORS: Record<PresetDomain, string> = {
  writing: 'var(--accent)',
  education: 'var(--info)',
  business: 'var(--success)',
  creative: 'var(--warning)',
  productivity: 'var(--text-secondary)',
  image: 'var(--error)',
}

interface PresetCardProps {
  preset: Preset
  onOpen: () => void
}

export function PresetCard({ preset, onOpen }: PresetCardProps) {
  const { t } = useTranslation()

  return (
    <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
      onClick={onOpen}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 8px)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color 120ms ease-out',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)')
      }
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: DOMAIN_COLORS[preset.domain],
        }}
      >
        {t(`preset.domain_${preset.domain}`)}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
        {preset.name}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {preset.description}
      </span>
      <span
        style={{
          marginTop: '4px',
          fontSize: '12px',
          color: 'var(--accent)',
          fontWeight: 500,
        }}
      >
        {t('preset.open')} →
      </span>
    </button>
  )
}

