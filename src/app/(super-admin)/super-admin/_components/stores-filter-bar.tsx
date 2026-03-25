'use client'

import { startTransition, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui'
import { cn } from '@/lib/utils'

const planLabels: Record<string, string> = {
  free: 'مجاني',
  basic: 'أساسي',
  pro: 'احترافي',
}

const planColors: Record<string, string> = {
  free: 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-[var(--ds-surface-muted)] text-[var(--ds-primary)]',
}

type StoresFilterBarProps = {
  storesByPlan: { plan: string; count: number }[]
  totalStores: number
  initialPlan: string
  initialSearch: string
}

function buildStoresQuery(plan: string, search: string) {
  const query = new URLSearchParams()
  const normalizedSearch = search.trim()

  if (plan && plan !== 'all') query.set('plan', plan)
  if (normalizedSearch) query.set('search', normalizedSearch)

  return query.toString()
}

export function StoresFilterBar({
  storesByPlan,
  totalStores,
  initialPlan,
  initialSearch,
}: StoresFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)

  const currentPlan = searchParams.get('plan')?.trim() || 'all'
  const currentSearch = searchParams.get('search')?.trim() || ''
  const isPendingSearch = search.trim() !== currentSearch

  useEffect(() => {
    setSearch(initialSearch)
  }, [initialSearch])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextQuery = buildStoresQuery(currentPlan, search)
      const currentQuery = searchParams.toString()

      if (nextQuery === currentQuery) return

      startTransition(() => {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        })
      })
    }, 320)

    return () => window.clearTimeout(timeoutId)
  }, [currentPlan, pathname, router, search, searchParams])

  function handlePlanChange(plan: string) {
    const nextQuery = buildStoresQuery(plan, search)

    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      })
    })
  }

  function handleReset() {
    setSearch('')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--ds-text)]">توزيع المتاجر حسب الخطة</h2>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handlePlanChange('all')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              currentPlan === 'all' ?
                'border-[var(--ds-primary)] bg-[var(--ds-primary)]/10 text-[var(--ds-text)]'
              : 'border-[var(--ds-border)] bg-[var(--ds-surface-glass)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]'
            )}
          >
            <span>الكل</span>
            <span className="text-xs opacity-80">{totalStores.toLocaleString('ar-EG')} متجر</span>
          </button>
          {storesByPlan.map((item) => {
            const isActive = currentPlan === item.plan

            return (
              <button
                key={item.plan}
                type="button"
                onClick={() => handlePlanChange(item.plan)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm transition-colors',
                  isActive ?
                    'border-[var(--ds-primary)] bg-[var(--ds-primary)]/10 text-[var(--ds-text)]'
                  : 'border-[var(--ds-border)] bg-[var(--ds-surface-glass)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]'
                )}
              >
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    planColors[item.plan] ??
                      'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'
                  )}
                >
                  {planLabels[item.plan] ?? item.plan}
                </span>
                <span className="text-xs sm:text-sm">{item.count} متجر</span>
              </button>
            )
          })}
        </div>

        <div className="flex w-full items-center gap-2 lg:w-[380px] lg:shrink-0 xl:w-[440px]">
          <div className="relative flex-1">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المتجر أو الرابط أو بريد التاجر"
              aria-label="ابحث في المتاجر"
              className="pe-4 ps-10"
            />
            {isPendingSearch ? (
              <span className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[var(--ds-border-strong)]/40 border-t-[var(--ds-text-muted)] animate-spin" />
            ) : null}
          </div>
          {(currentPlan !== 'all' || currentSearch) ? (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-11 items-center justify-center rounded-[var(--ds-radius-md)] border border-[var(--ds-divider)] px-4 text-sm font-medium text-[var(--ds-text-muted)] transition-all duration-[var(--ds-motion-base)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
            >
              إلغاء
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
