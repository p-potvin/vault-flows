import { useMemo, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'

import {
  NODE_REGISTRY,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type NodeCategory,
} from '@/nodes/registry'
import type { NodeType } from '@/nodes/types'
import { useFlowStore } from '@/store/flowStore'

interface NodeBrowserSidebarProps {
  onNodeAdded?: (nodeId: string, type: NodeType) => void
}

/**
 * Left-rail browser of every node type the canvas knows how to render.
 *
 * Two ways to insert a node onto the canvas:
 *   - Click the row → calls flowStore.addNode at a staggered default position.
 *   - Drag the row → React Flow's onDrop handler in the canvas resolves the
 *     drop coordinates and calls addNode there. (Drag uses a custom MIME
 *     `application/vault-flows-node` carrying the node type.)
 *
 * Categories come from NODE_REGISTRY[type].category. The list collapses by
 * category and supports a text filter for projects with lots of node types.
 */
export function NodeBrowserSidebar({ onNodeAdded }: NodeBrowserSidebarProps = {}) {
  const { t } = useTranslation()
  const addNode = useFlowStore((s) => s.addNode)
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out: Record<NodeCategory, Array<{ type: NodeType; label: string; description: string; color: string }>> = {
      inputs: [],
      loaders: [],
      generation: [],
      transform: [],
      outputs: [],
    }
    for (const [rawType, meta] of Object.entries(NODE_REGISTRY)) {
      const type = rawType as NodeType
      // Hide the legacy alias from the browser — users should pick model_call
      // and switch provider:ollama in the inspector instead.
      if (type === 'llm') continue
      if (q && !meta.label.toLowerCase().includes(q) && !type.includes(q) && !meta.description.toLowerCase().includes(q)) {
        continue
      }
      out[meta.category].push({
        type,
        label: meta.label,
        description: meta.description,
        color: meta.color,
      })
    }
    return out
  }, [query])

  function handleAdd(type: NodeType) {
    const id = addNode(type)
    onNodeAdded?.(id, type)
  }

  function handleDragStart(e: DragEvent<HTMLButtonElement>, type: NodeType) {
    e.dataTransfer.setData('application/vault-flows-node', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-vw-console-border bg-vw-console-surface/80 px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('node.browser_filter', { defaultValue: 'Filter nodes…' })}
            className="w-full rounded-md border border-white/10 bg-vw-console-bg/70 py-1.5 pl-7 pr-2 text-[11px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-vw-console-violet/50"
          />
        </div>
      </div>

      {/* Category groups */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {CATEGORY_ORDER.map((category) => {
          const items = grouped[category]
          if (items.length === 0) return null
          return (
            <div key={category} className="mb-3">
              <div className="px-2 pb-1 pt-1.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">
                  {CATEGORY_LABELS[category]}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onClick={() => handleAdd(item.type)}
                    title={item.description}
                    className="group flex items-start gap-2 rounded-md border border-transparent bg-vw-console-bg/40 px-2 py-1.5 text-left transition-colors hover:border-vw-console-border hover:bg-vw-console-raised/70"
                  >
                    <span
                      className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: item.color, boxShadow: `0 0 4px ${item.color}` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate font-sans text-[11px] font-medium text-white/85">
                          {item.label}
                        </span>
                        <Plus className="h-3 w-3 flex-shrink-0 text-white/30 transition-colors group-hover:text-vw-console-gold" />
                      </div>
                      <div className="truncate font-sans text-[10px] text-white/45">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {Object.values(grouped).every((g) => g.length === 0) && (
          <div className="px-3 py-6 text-center font-sans text-[11px] text-white/40">
            {t('node.browser_empty', { defaultValue: 'No nodes match this filter.' })}
          </div>
        )}
      </div>
    </div>
  )
}
