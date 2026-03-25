import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type CardProps = {
  children: ReactNode
  className?: string
  variant?: 'default' | 'feature' | 'hero' | 'metric' | 'muted'
}

const variantClasses = {
  default: 'surface-panel',
  feature: 'surface-panel motion-card-hover',
  hero: 'ds-hero-panel',
  metric: 'surface-panel-elevated motion-card-hover',
  muted:
    'rounded-[var(--ds-radius-lg)] border border-[var(--ds-divider)] bg-[var(--ds-surface-muted)] shadow-none',
} as const

export function Card({ children, className, variant = 'default' }: CardProps) {
  return (
    <section
      className={cn(
        'p-4 sm:p-5',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </section>
  )
}

