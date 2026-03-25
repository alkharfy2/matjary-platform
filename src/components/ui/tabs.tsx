'use client'

import { cn } from '@/lib/utils'

type TabItem = {
  id: string
  label: string
}

type TabsProps = {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('inline-flex rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-1', className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'rounded-[calc(var(--ds-radius-md)-2px)] px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--ds-motion-fast)]',
              active ? 'bg-[var(--ds-primary)] text-[var(--ds-primary-contrast)]' : 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
