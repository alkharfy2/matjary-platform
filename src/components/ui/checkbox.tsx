import * as React from 'react'
import { cn } from '@/lib/utils'

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] text-[var(--ds-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-elevated)]',
        className
      )}
      {...props}
    />
  )
})
