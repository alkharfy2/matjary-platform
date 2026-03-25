import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type FormSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <Card className={cn('space-y-4', className)}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--ds-text)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--ds-text-muted)]">{description}</p> : null}
      </div>
      {children}
    </Card>
  )
}

