import * as React from 'react'
import { cn } from '@/lib/utils'

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-4 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] backdrop-blur transition-all duration-[var(--ds-motion-fast)] hover:border-[var(--ds-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
})
