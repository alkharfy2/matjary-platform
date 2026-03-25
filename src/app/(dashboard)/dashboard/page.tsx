import { notFound } from 'next/navigation'
import { ShoppingCart, Wallet, Package, Users } from 'lucide-react'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { getDashboardAnalyticsData } from '@/lib/queries/dashboard-analytics'
import { getOrderStatusLabel } from '@/lib/queries/dashboard-orders'
import { formatDate, formatPrice } from '@/lib/utils'
import { Card } from '@/components/ui'
import { PageHeader, StatCard, EmptyState } from '@/components/patterns'

function getPaymentStatusLabel(status: string) {
  if (status === 'paid') return 'مدفوع'
  if (status === 'pending') return 'في انتظار الدفع'
  if (status === 'failed') return 'فشل الدفع'
  if (status === 'refunded') return 'مسترجع'
  return status
}

export default async function DashboardOverviewPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const analytics = await getDashboardAnalyticsData(store.id)
  const currency = store.settings.currency || 'EGP'

  const stats = [
    { label: 'إجمالي الطلبات', value: String(analytics.summary.totalOrders), icon: <ShoppingCart className="h-5 w-5" /> },
    { label: 'الإيرادات', value: formatPrice(analytics.summary.totalRevenue, currency), icon: <Wallet className="h-5 w-5" /> },
    { label: 'المنتجات', value: String(analytics.summary.totalProducts), icon: <Package className="h-5 w-5" /> },
    { label: 'العملاء', value: String(analytics.summary.totalCustomers), icon: <Users className="h-5 w-5" /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="نظرة عامة" description="ملخص أداء متجرك وأحدث الطلبات." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-[var(--ds-border)] px-4 py-3">
          <h2 className="text-lg font-semibold text-[var(--ds-text)]">أحدث الطلبات</h2>
        </div>

        {analytics.recentOrders.length === 0 ? (
          <div className="p-4">
            <EmptyState title="لا توجد طلبات بعد" description="ستظهر هنا آخر طلبات متجرك عند بدء المبيعات." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">رقم الطلب</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">العميل</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الإجمالي</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">حالة الطلب</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">حالة الدفع</th>
                  <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 font-medium text-[var(--ds-text)]">#{order.orderNumber}</td>
                    <td className="px-4 py-3 text-[var(--ds-text)]">{order.customerName}</td>
                    <td className="px-4 py-3 text-[var(--ds-text)]">{formatPrice(Number(order.total), currency)}</td>
                    <td className="px-4 py-3 text-[var(--ds-text)]">{getOrderStatusLabel(order.orderStatus)}</td>
                    <td className="px-4 py-3 text-[var(--ds-text)]">{getPaymentStatusLabel(order.paymentStatus)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--ds-text-muted)]">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
