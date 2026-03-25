import { notFound } from 'next/navigation'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { getDashboardAnalyticsData } from '@/lib/queries/dashboard-analytics'
import { formatPrice } from '@/lib/utils'
import { Button, Card, Select } from '@/components/ui'
import { PageHeader, StatCard, EmptyState } from '@/components/patterns'

type AnalyticsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseRangeDays(value: string | undefined) {
  if (value === '7' || value === '30' || value === '90') return Number(value)
  return 7
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const raw = searchParams ? await searchParams : {}
  const rangeDays = parseRangeDays(getFirstParam(raw.range))

  const to = new Date()
  const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000)

  const analytics = await getDashboardAnalyticsData(store.id, { from, to })
  const currency = store.settings.currency || 'EGP'

  const stats = [
    { label: 'الإيرادات', value: formatPrice(analytics.period.totalRevenue, currency) },
    { label: 'عدد الطلبات', value: String(analytics.period.totalOrders) },
    { label: 'متوسط قيمة الطلب', value: formatPrice(analytics.period.averageOrderValue, currency) },
    { label: 'عملاء جدد', value: String(analytics.period.newCustomers) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="التقارير والإحصائيات" description="نظرة سريعة على أداء المتجر خلال الفترة المحددة." />

      <form method="GET" className="max-w-md">
        <Card className="flex items-center gap-2">
          <Select name="range" defaultValue={String(rangeDays)}>
            <option value="7">آخر 7 أيام</option>
            <option value="30">آخر 30 يوم</option>
            <option value="90">آخر 3 أشهر</option>
          </Select>
          <Button type="submit" variant="secondary">تطبيق</Button>
        </Card>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-[var(--ds-text)]">الإيرادات حسب اليوم</h2>
          {analytics.dailyRevenue.length === 0 ? (
            <EmptyState title="لا توجد بيانات" description="لا توجد إيرادات ضمن الفترة المحددة." />
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {analytics.dailyRevenue.map((row) => (
                <div key={row.date} className="flex items-center justify-between rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] px-3 py-2 text-sm">
                  <span className="text-[var(--ds-text)]">{row.date}</span>
                  <span className="text-[var(--ds-text-muted)]">{row.orders} طلب</span>
                  <span className="font-semibold text-[var(--ds-text)]">{formatPrice(row.revenue, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-[var(--ds-text)]">المنتجات الأكثر مبيعًا</h2>
          {analytics.topProducts.length === 0 ? (
            <EmptyState title="لا توجد مبيعات" description="ستظهر المنتجات الأعلى أداءً عند توفر طلبات." />
          ) : (
            <div className="max-h-80 space-y-2 overflow-auto">
              {analytics.topProducts.map((product, index) => (
                <div key={`${product.productId ?? 'unknown'}-${index}`} className="rounded-[var(--ds-radius-md)] border border-[var(--ds-border)] px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="truncate font-medium text-[var(--ds-text)]">{product.name}</p>
                    <span className="text-[var(--ds-text-muted)]">{product.quantitySold} قطعة</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-[var(--ds-text)]">{formatPrice(product.revenue, currency)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
