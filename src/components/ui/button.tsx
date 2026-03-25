import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  glow?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,var(--ds-primary),color-mix(in_oklab,var(--ds-primary)_74%,var(--ds-accent)))] text-[var(--ds-primary-contrast)] hover:brightness-[1.03]',
  secondary:
    'border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] text-[var(--ds-text)] hover:bg-[var(--ds-hover)]',
  ghost:
    'text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]',
  danger:
    'bg-[linear-gradient(135deg,var(--ds-danger),color-mix(in_oklab,var(--ds-danger)_70%,#7f1d1d))] text-white hover:brightness-[1.03]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-10 w-10',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, glow = false, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--ds-radius-md)] border border-transparent font-medium leading-none transition-all duration-[var(--ds-motion-base)] ease-[var(--ds-motion-spring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-elevated)] disabled:pointer-events-none disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        glow && variant === 'primary' && 'ds-button-glow',
        variant !== 'ghost' && 'shadow-[var(--ds-shadow-sm)]',
        !disabled && 'hover:-translate-y-0.5',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  )
})
