import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  eyebrow?: string
}

export function EmptyState({ title, description, action, eyebrow = 'لا توجد بيانات' }: EmptyStateProps) {
  return (
    <Card variant="feature" className="px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ds-primary-soft)] text-[var(--ds-primary)] shadow-[var(--ds-shadow-sm)]">
        <span className="text-2xl">✦</span>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">{eyebrow}</p>
      <h3 className="mt-3 text-lg font-semibold text-[var(--ds-text)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--ds-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  )
}

