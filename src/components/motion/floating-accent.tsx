import { cn } from '@/lib/utils'

type FloatingAccentProps = {
  className?: string
  tone?: 'primary' | 'accent' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-28 w-28',
  md: 'h-44 w-44',
  lg: 'h-64 w-64',
} as const

const toneClasses = {
  primary: 'bg-[color:color-mix(in_oklab,var(--ds-primary)_18%,white)]',
  accent: 'bg-[color:color-mix(in_oklab,var(--ds-accent)_24%,white)]',
  neutral: 'bg-[color:color-mix(in_oklab,var(--ds-border-strong)_32%,white)]',
} as const

export function FloatingAccent({
  className,
  tone = 'primary',
  size = 'md',
}: FloatingAccentProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute rounded-full blur-3xl opacity-80 animate-float-soft',
        sizeClasses[size],
        toneClasses[tone],
        className
      )}
    />
  )
}
