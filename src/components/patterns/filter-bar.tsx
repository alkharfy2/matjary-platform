import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type FilterBarProps = {
  children: ReactNode
  className?: string
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <Card
      variant="feature"
      className={cn('p-4 sm:p-5', className)}
    >
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
    </Card>
  )
}

