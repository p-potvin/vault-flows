import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PRESETS, getPresetsByDomain } from '@/presets/index'
import type { PresetDomain } from '@/nodes/types'
import { useFlowStore } from '@/store/flowStore'
import { PresetCard } from './PresetCard'

const DOMAINS: Array<PresetDomain | 'all'> = [
  'all',
  'writing',
  'education',
  'business',
  'creative',
  'productivity',
  'image',
]

interface PresetLibraryProps {
  onPresetLoaded: () => void
}

export function PresetLibrary({ onPresetLoaded }: PresetLibraryProps) {
  const { t } = useTranslation()
  const loadPreset = useFlowStore((s) => s.loadPreset)
  const [activeDomain, setActiveDomain] = useState<PresetDomain | 'all'>('all')

  const visible = activeDomain === 'all' ? PRESETS : getPresetsByDomain(activeDomain)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Domain filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {DOMAINS.map((d) => (
          <button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
            key={d}
            onClick={() => setActiveDomain(d)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border)',
              background: activeDomain === d ? 'var(--accent)' : 'transparent',
              color: activeDomain === d ? 'var(--text-inverse)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: activeDomain === d ? 600 : 400,
            }}
          >
            {t(`preset.domain_${d}`)}
          </button>
        ))}
      </div>

      {/* Preset cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {visible.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onOpen={() => {
              loadPreset(preset)
              onPresetLoaded()
            }}
          />
        ))}
      </div>
    </div>
  )
}
