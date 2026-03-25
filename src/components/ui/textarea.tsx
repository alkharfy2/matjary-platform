import * as React from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-[var(--ds-radius-md)] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-3 py-2 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-colors duration-[var(--ds-motion-fast)] placeholder:text-[var(--ds-text-muted)]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  )
})
