import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ActionToolbarProps = {
  children: ReactNode
  className?: string
}

export function ActionToolbar({ children, className }: ActionToolbarProps) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

