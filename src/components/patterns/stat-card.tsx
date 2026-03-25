import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

type StatCardProps = {
  label: string
  value: string
  icon?: ReactNode
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card variant="metric" className="relative overflow-hidden">
      <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--ds-primary),transparent)]" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--ds-text-muted)] sm:text-sm">{label}</p>
        {icon ? (
          <div className="rounded-xl bg-[var(--ds-primary-soft)] p-2 text-[var(--ds-primary)] shadow-[var(--ds-shadow-sm)]">
            {icon}
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-2xl font-black text-[var(--ds-text)] sm:text-3xl">{value}</p>
    </Card>
  )
}

