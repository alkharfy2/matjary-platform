import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  eyebrow?: string
}

export function PageHeader({ title, description, action, className, eyebrow }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4 rounded-[var(--ds-radius-lg)] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-5 py-5 shadow-[var(--ds-shadow-sm)] backdrop-blur sm:px-6', className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <span className="ds-pill text-xs font-semibold">
            {eyebrow}
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ds-text)] sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-[var(--ds-text-muted)]">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

