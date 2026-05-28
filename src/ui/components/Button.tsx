import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: Variant
  size?: Size
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  /** Forwarded as `type` to <button>. Defaults to "button" to prevent
   * accidental form submissions. Set to "submit" on form action buttons. */
  buttonType?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

/**
 * vaultwares-revisited button. Action buttons use JetBrains Mono uppercase
 * tracking-wider so they read like operator commands; ghost/icon buttons
 * use Inter for less weight.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  buttonType = 'button',
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const padding =
    variant === 'icon'
      ? size === 'sm'
        ? 'p-1.5'
        : size === 'lg'
          ? 'p-3'
          : 'p-2'
      : size === 'sm'
        ? 'px-3 py-1.5'
        : size === 'lg'
          ? 'px-6 py-3'
          : 'px-4 py-2'

  const fontSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs'
  const fontWeight = variant === 'ghost' || variant === 'icon' ? '' : 'font-bold'
  const fontFamily = variant === 'ghost' || variant === 'icon' ? '' : 'font-mono uppercase tracking-wider'

  const tone =
    variant === 'primary'
      ? 'bg-vw-console-gold text-vw-console-bg hover:bg-vw-signal-warning'
      : variant === 'secondary'
        ? 'bg-transparent text-white border border-white/10 hover:border-vw-console-gold/50 hover:text-vw-console-gold'
        : variant === 'danger'
          ? 'bg-transparent text-vw-signal-alert border border-vw-signal-alert/30 hover:bg-vw-signal-alert/10'
          : variant === 'ghost'
            ? 'bg-transparent text-violet-100/70 hover:text-vw-console-gold'
            : /* icon */ 'bg-transparent text-violet-100/70 hover:text-vw-console-gold'

  const shape = variant === 'icon' ? 'rounded-lg' : 'rounded-lg'
  const widthCls = fullWidth ? 'w-full justify-center' : ''
  const disabledCls = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''

  return (
    <button
      type={buttonType}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 transition-all select-none',
        padding,
        fontSize,
        fontWeight,
        fontFamily,
        tone,
        shape,
        widthCls,
        disabledCls,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}
