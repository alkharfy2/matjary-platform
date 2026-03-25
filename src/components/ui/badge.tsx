import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/lib/ui/types'

type BadgeProps = {
  children: ReactNode
  tone?: StatusTone
  className?: string
}

const toneVars: Record<StatusTone, string> = {
  success: 'var(--ds-success)',
  warning: 'var(--ds-warning)',
  danger: 'var(--ds-danger)',
  neutral: 'var(--ds-text-muted)',
  info: 'var(--ds-primary)',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-[var(--ds-shadow-sm)]',
        className
      )}
      style={{
        borderColor: `color-mix(in oklab, ${toneVars[tone]} 32%, var(--ds-divider))`,
        backgroundColor: `color-mix(in oklab, ${toneVars[tone]} 16%, var(--ds-surface-elevated))`,
        color: `color-mix(in oklab, ${toneVars[tone]} 72%, var(--ds-text))`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {children}
    </span>
  )
}

