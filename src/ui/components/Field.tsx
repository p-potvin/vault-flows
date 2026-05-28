import { forwardRef, type ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string
  required?: boolean
  surface?: 'console' | 'warm'
  className?: string
  children: ReactNode
}

/**
 * Labeled form field. Label is JetBrains Mono uppercase tracking-wider so it
 * reads like a CLI flag rather than a UI label. The shell handles spacing
 * + optional hint + error message; the actual input/textarea/select is
 * passed in as children (allowing whatever element type you need).
 */
export function Field({
  label,
  hint,
  error,
  required,
  surface = 'console',
  className,
  children,
}: FieldProps) {
  const labelColor = surface === 'warm' ? 'text-vw-warm-ink/60' : 'text-white/55'
  const hintColor = surface === 'warm' ? 'text-vw-warm-ink/40' : 'text-white/40'

  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      <label
        className={[
          'font-mono text-[10px] font-bold uppercase tracking-wider',
          labelColor,
          'flex items-center gap-1.5',
        ].join(' ')}
      >
        {label}
        {required && <span className="text-vw-signal-alert">*</span>}
        {hint && <span className={['font-sans normal-case tracking-normal font-normal text-[10px]', hintColor].join(' ')}>· {hint}</span>}
      </label>
      {children}
      {error && (
        <span className="font-sans text-[11px] text-vw-signal-alert" title={error}>
          {error}
        </span>
      )}
    </div>
  )
}

/**
 * Pre-styled <input> matching the console palette. Forwards refs so callers
 * can autoFocus or imperatively grab the input element.
 */
type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  surface?: 'console' | 'warm'
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ surface = 'console', className, ...rest }, ref) {
    const tone =
      surface === 'warm'
        ? 'bg-vw-warm-bg text-vw-warm-ink border-vw-warm-ink/15 placeholder:text-vw-warm-ink/35 focus:border-vw-warm-gold/50'
        : 'bg-vw-console-bg text-white border-white/10 placeholder:text-white/30 focus:border-vw-console-violet/50'
    return (
      <input
        ref={ref}
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none',
          'focus:ring-2 focus:ring-vw-console-violet/20',
          tone,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    )
  },
)

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  surface?: 'console' | 'warm'
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ surface = 'console', className, ...rest }, ref) {
    const tone =
      surface === 'warm'
        ? 'bg-vw-warm-bg text-vw-warm-ink border-vw-warm-ink/15 placeholder:text-vw-warm-ink/35 focus:border-vw-warm-gold/50'
        : 'bg-vw-console-bg text-white border-white/10 placeholder:text-white/30 focus:border-vw-console-violet/50'
    return (
      <textarea
        ref={ref}
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm font-sans transition-colors outline-none resize-vertical',
          'focus:ring-2 focus:ring-vw-console-violet/20',
          tone,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
    )
  },
)
