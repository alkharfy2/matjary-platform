import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type PaginationBarProps = {
  page: number
  totalPages: number
  summary: string
  prevHref?: string
  nextHref?: string
}

export function PaginationBar({ page, totalPages, summary, prevHref, nextHref }: PaginationBarProps) {
  if (totalPages <= 1) return null

  return (
    <Card variant="feature" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--ds-text-muted)]">{summary}</p>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref}>
            <Button variant="secondary" size="sm">السابق</Button>
          </Link>
        ) : (
          <Button variant="secondary" size="sm" disabled>السابق</Button>
        )}

        <span className="min-w-20 rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-3 py-1 text-center text-xs font-semibold text-[var(--ds-text-muted)] sm:text-sm">
          {page} / {totalPages}
        </span>

        {nextHref ? (
          <Link href={nextHref}>
            <Button variant="secondary" size="sm">التالي</Button>
          </Link>
        ) : (
          <Button variant="secondary" size="sm" disabled>التالي</Button>
        )}
      </div>
    </Card>
  )
}
