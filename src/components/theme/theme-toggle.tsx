'use client'

import { LaptopMinimal, MoonStar, SunMedium } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemePreference } from '@/lib/theme'
import { useTheme } from './theme-provider'

const options: Array<{
  value: ThemePreference
  label: string
  shortLabel: string
  icon: typeof LaptopMinimal
}> = [
  { value: 'system', label: 'تلقائي', shortLabel: 'Auto', icon: LaptopMinimal },
  { value: 'light', label: 'فاتح', shortLabel: 'Light', icon: SunMedium },
  { value: 'dark', label: 'داكن', shortLabel: 'Dark', icon: MoonStar },
]

type ThemeToggleProps = {
  className?: string
  compact?: boolean
}

export function ThemeToggle({ className, compact = false }: ThemeToggleProps) {
  const { preference, mounted, resolvedTheme, setPreference } = useTheme()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] p-1 shadow-[var(--ds-shadow-sm)] backdrop-blur-xl',
        className
      )}
      role="group"
      aria-label="تبديل الثيم"
      data-theme-toggle
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = preference === option.value
        const title =
          option.value === 'system' && mounted
            ? `${option.label} (${resolvedTheme === 'dark' ? 'يعرض الداكن' : 'يعرض الفاتح'})`
            : option.label

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            aria-pressed={active}
            title={title}
            suppressHydrationWarning
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-[var(--ds-motion-fast)]',
              active
                ? 'bg-[var(--ds-surface-elevated)] text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)]'
                : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]',
              compact && 'h-9 w-9 px-0 py-0'
            )}
          >
            <Icon className="h-4 w-4" />
            {compact ? <span className="sr-only">{option.label}</span> : <span>{option.shortLabel}</span>}
          </button>
        )
      })}
    </div>
  )
}

