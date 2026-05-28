import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Dice5 } from 'lucide-react'

/**
 * Small inline controls designed for use INSIDE canvas node cards.
 * They share styling with the side-panel Fields but are tighter, use the
 * `nodrag` className so React Flow doesn't start a drag when the user
 * clicks inside, and have smaller fonts to keep nodes compact.
 */

interface InlineFieldProps {
  label?: string
  children: ReactNode
}

export function InlineField({ label, children }: InlineFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

const inputBase =
  'nodrag w-full rounded-md border border-white/10 bg-vw-console-bg/70 px-2 py-1 text-[11px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-vw-console-violet/50'

export function InlineTextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return <input className={[inputBase, className].filter(Boolean).join(' ')} {...rest} />
}

export function InlineNumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return (
    <input
      type="number"
      className={[inputBase, 'tabular-nums', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

export function InlineTextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props
  return (
    <textarea
      className={[
        inputBase,
        'min-h-[44px] resize-y font-sans leading-snug',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}

export function InlineSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props
  return (
    <select
      className={[inputBase, 'pr-6 font-mono', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}

/**
 * Number input with a dice button on the right that fills a random seed.
 * Picks a 31-bit integer, which is what most ComfyUI samplers expect.
 */
export function InlineSeedInput({
  value,
  onChange,
}: {
  value: unknown
  onChange: (next: number) => void
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={typeof value === 'number' || typeof value === 'string' ? String(value ?? '') : ''}
        onChange={(e) => {
          const v = e.target.value
          if (v === '') return onChange(0)
          const n = Number(v)
          onChange(Number.isFinite(n) ? n : 0)
        }}
        className={[inputBase, 'pr-7 tabular-nums'].join(' ')}
      />
      <button
        type="button"
        title="Randomize"
        onClick={() => onChange(Math.floor(Math.random() * 0x7fffffff))}
        className="nodrag absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/45 transition-colors hover:text-vw-console-gold"
      >
        <Dice5 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/**
 * Common image-generation size presets. When the workflow exposes both
 * `width` and `height` in its input_paths, the ComfyUIWorkflowNode renders
 * a single Size dropdown driving both, with `Custom` revealing manual
 * number inputs.
 */
export const SIZE_PRESETS: Array<{ label: string; w: number; h: number }> = [
  { label: '512 × 512',     w: 512,  h: 512 },
  { label: '768 × 768',     w: 768,  h: 768 },
  { label: '1024 × 1024',   w: 1024, h: 1024 },
  { label: '768 × 1024 ↕',  w: 768,  h: 1024 },
  { label: '1024 × 768 ↔',  w: 1024, h: 768 },
  { label: '1024 × 1536 ↕', w: 1024, h: 1536 },
  { label: '1536 × 1024 ↔', w: 1536, h: 1024 },
]

/**
 * Collapsible "Advanced" section. Defaults collapsed; click the header to
 * expand. Used to hide secondary params (temperature, system prompt, etc.)
 * behind a single tap so the node stays compact.
 */
export function InlineAdvanced({
  label = 'Advanced',
  defaultOpen = false,
  children,
}: {
  label?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="nodrag flex items-center gap-1 self-start font-mono text-[9px] font-bold uppercase tracking-wider text-white/45 transition-colors hover:text-vw-console-gold"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {label}
      </button>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  )
}
