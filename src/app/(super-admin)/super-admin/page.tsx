import { Card } from '@/components/ui'
import { PageHeader, StatCard } from '@/components/patterns'
import { getAdminAnalyticsData } from '@/lib/queries/admin-analytics'
import { formatDate, formatPrice, formatRelativeTime } from '@/lib/utils'
import { StoresFilterBar } from './_components/stores-filter-bar'

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

type SuperAdminOverviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeStoreOverviewFilters(params: {
  plan?: string
  search?: string
}) {
  return {
    plan: params.plan?.trim() || 'all',
    search: params.search?.trim() || '',
  }
}

export default async function SuperAdminOverviewPage({
  searchParams,
}: SuperAdminOverviewPageProps) {
  const rawSearchParams = await searchParams
  const filters = normalizeStoreOverviewFilters({
    plan: getFirstParam(rawSearchParams.plan),
    search: getFirstParam(rawSearchParams.search),
  })
  let data = null

  try {
    data = await getAdminAnalyticsData({
      plan: filters.plan !== 'all' ? filters.plan : undefined,
      search: filters.search || undefined,
    })
  } catch (error) {
    console.error('Super Admin analytics error:', error)
  }

  const summary = data?.summary
  const storesByPlan = data?.storesByPlan ?? []
  const recentStores = data?.recentStores ?? []
  const recentActivity = data?.recentActivity ?? []
  const hasStoreFilters = filters.plan !== 'all' || Boolean(filters.search)

  const stats = [
    { label: 'إجمالي المتاجر', value: summary?.totalStores?.toLocaleString('ar-EG') ?? '—' },
    { label: 'المتاجر النشطة', value: summary?.activeStores?.toLocaleString('ar-EG') ?? '—' },
    { label: 'إجمالي التجار', value: summary?.totalMerchants?.toLocaleString('ar-EG') ?? '—' },
    {
      label: 'إجمالي الطلبات الناجحة فقط',
      value: summary?.successfulOrders?.toLocaleString('ar-EG') ?? '—',
    },
    {
      label: 'اشتراكات الخطط فقط',
      value: summary ? formatPrice(summary.subscriptionRevenue) : '—',
    },
    {
      label: 'عمولة المنصة فقط',
      value: summary ? formatPrice(summary.commissionRevenue) : '—',
    },
    {
      label: 'اشتراكات + عمولات',
      value: summary ? formatPrice(summary.subscriptionAndCommissionRevenue) : '—',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="نظرة عامة على المنصة"
        description="ملخص المتاجر والتجار والإيرادات والنشاطات الأخيرة من واجهة إدارة موحدة وأكثر أناقة."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      {storesByPlan.length > 0 ? (
        <Card variant="feature" className="p-6">
          <StoresFilterBar
            storesByPlan={storesByPlan}
            totalStores={summary?.totalStores ?? 0}
            initialPlan={filters.plan}
            initialSearch={filters.search}
          />
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="feature" className="overflow-hidden p-0">
          <div className="border-b border-[var(--ds-border)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[var(--ds-text)]">
                {hasStoreFilters ? 'المتاجر المطابقة' : 'أحدث المتاجر'}
              </h2>
              {hasStoreFilters ? (
                <span className="text-xs text-[var(--ds-text-muted)]/80">
                  {recentStores.length.toLocaleString('ar-EG')} نتيجة
                </span>
              ) : null}
            </div>
          </div>
          {recentStores.length === 0 ? (
            <p className="py-8 text-center text-[var(--ds-text-muted)]">
              {hasStoreFilters ? 'لا توجد متاجر مطابقة للفلاتر الحالية' : 'لا توجد متاجر بعد'}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--ds-border)]/70">
              {recentStores.map((store) => (
                <li key={store.id} className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ds-text)]">{store.name}</p>
                    <p className="truncate text-xs text-[var(--ds-text-muted)]/80">{store.merchantEmail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${planColors[store.plan] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'}`}>
                      {planLabels[store.plan] ?? store.plan}
                    </span>
                    <span className={`h-2.5 w-2.5 rounded-full ${store.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="text-xs text-[var(--ds-text-muted)]/80">{formatDate(store.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card variant="feature" className="overflow-hidden p-0">
          <div className="border-b border-[var(--ds-border)] px-4 py-4">
            <h2 className="font-semibold text-[var(--ds-text)]">سجل النشاطات</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-8 text-center text-[var(--ds-text-muted)]">لا توجد نشاطات بعد</p>
          ) : (
            <ul className="divide-y divide-[var(--ds-border)]/70">
              {recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--ds-text)]">
                      <span className="font-medium">{log.action}</span>
                      <span className="mx-1 text-[var(--ds-text-muted)]/80">·</span>
                      <span className="text-[var(--ds-text-muted)]">{log.entity}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[var(--ds-text-muted)]/80">{formatRelativeTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
