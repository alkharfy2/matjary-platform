import { cn } from '@/lib/utils'

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]', className)} />
}
