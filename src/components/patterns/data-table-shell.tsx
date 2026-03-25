import type { ReactNode } from 'react'
import type { DataTableColumn } from '@/lib/ui/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type DataTableShellProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  className?: string
  emptyState?: ReactNode
}

export function DataTableShell<T>({
  columns,
  rows,
  rowKey,
  className,
  emptyState,
}: DataTableShellProps<T>) {
  if (!rows.length && emptyState) return <>{emptyState}</>

  return (
    <Card variant="feature" className={cn('overflow-hidden p-0', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[linear-gradient(180deg,rgba(239,245,255,0.92),rgba(255,255,255,0.88))]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'px-4 py-3 text-start font-medium text-[var(--ds-text-muted)]',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-[var(--ds-border)]/80 transition-colors duration-[var(--ds-motion-fast)] hover:bg-[color:color-mix(in_oklab,var(--ds-primary)_4%,white)]"
              >
                {columns.map((column) => (
                  <td key={column.id} className={cn('px-4 py-3 text-[var(--ds-text)]', column.cellClassName)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

