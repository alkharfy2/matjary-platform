import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TrustItem = {
  title: string
  description: string
  icon?: ReactNode
}

type TrustBadgesProps = {
  items?: TrustItem[]
  className?: string
}

function CashOnDeliveryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M2 9h2M20 9h2M2 15h2M20 15h2" />
    </svg>
  )
}

function FastShippingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <path d="M1 12h15M10 5l7 7-7 7" />
      <path d="M16 3v5h5" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M1 17h3M15 17h6" />
    </svg>
  )
}

function EasyReturnIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

const defaultTrustItems: TrustItem[] = [
  {
    title: 'الدفع عند الاستلام',
    description: 'اشترِ بثقة وادفع عند استلام الطلب.',
    icon: <CashOnDeliveryIcon />,
  },
  {
    title: 'شحن سريع',
    description: 'توصيل واضح وسريع مع متابعة أسهل للحالة.',
    icon: <FastShippingIcon />,
  },
  {
    title: 'استرجاع أسهل',
    description: 'رسائل أوضح وتجربة أكثر طمأنة بعد الشراء.',
    icon: <EasyReturnIcon />,
  },
]

export function TrustBadges({ items, className }: TrustBadgesProps) {
  const badges = items ?? defaultTrustItems

  return (
    <section
      aria-label="مميزات المتجر"
      className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {badges.map((badge) => (
        <div
          key={badge.title}
          className="surface-panel motion-card-hover flex h-full items-start gap-3 rounded-[24px] p-4"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
            {badge.icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ds-text)]">{badge.title}</h3>
            <p className="mt-1 text-xs leading-6 text-[var(--ds-text-muted)]">{badge.description}</p>
          </div>
        </div>
      ))}
    </section>
  )
}
