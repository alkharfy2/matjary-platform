import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { StatusTone } from '@/lib/ui/types'

type AlertProps = {
  tone?: StatusTone
  title?: string
  children: ReactNode
  className?: string
}

const toneVars: Record<StatusTone, string> = {
  success: 'var(--ds-success)',
  warning: 'var(--ds-warning)',
  danger: 'var(--ds-danger)',
  neutral: 'var(--ds-text-muted)',
  info: 'var(--ds-primary)',
}

export function Alert({ tone = 'neutral', title, children, className }: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--ds-radius-md)] border px-4 py-3 text-sm shadow-[var(--ds-shadow-sm)]',
        className
      )}
      style={{
        borderColor: `color-mix(in oklab, ${toneVars[tone]} 30%, var(--ds-divider))`,
        backgroundColor: `color-mix(in oklab, ${toneVars[tone]} 12%, var(--ds-surface-elevated))`,
        color: `color-mix(in oklab, ${toneVars[tone]} 74%, var(--ds-text))`,
      }}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  )
}

