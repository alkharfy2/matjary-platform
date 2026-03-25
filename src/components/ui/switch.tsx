'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-colors duration-[var(--ds-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ds-surface-elevated)]',
        checked ? 'bg-[var(--ds-primary)]' : 'bg-[var(--ds-border-strong)]',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-[var(--ds-surface-elevated)] shadow transition-transform duration-[var(--ds-motion-fast)]',
          checked ? '-translate-x-5' : '-translate-x-0.5'
        )}
      />
    </button>
  )
}
