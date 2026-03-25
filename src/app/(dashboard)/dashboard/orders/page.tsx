import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getDashboardOrders,
  getOrderStatusLabel,
  normalizeDashboardOrdersFilters,
  type DashboardOrdersFilters,
} from '@/lib/queries/dashboard-orders'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { formatDate, formatPrice } from '@/lib/utils'
import { Button, Card, Input, Select } from '@/components/ui'
import { EmptyState, FilterBar, PageHeader, PaginationBar, StatusPill } from '@/components/patterns'

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getPaymentStatusLabel(status: string) {
  if (status === 'pending') return 'في انتظار الدفع'
  if (status === 'awaiting_payment') return 'في انتظار الدفع'
  if (status === 'paid') return 'مدفوع'
  if (status === 'failed') return 'فشل الدفع'
  if (status === 'refunded') return 'مسترجع'
  return status
}

function getOrderStatusTone(status: string) {
  if (status === 'pending') return 'warning' as const
  if (status === 'confirmed') return 'info' as const
  if (status === 'processing') return 'info' as const
  if (status === 'shipped') return 'info' as const
  if (status === 'delivered') return 'success' as const
  if (status === 'cancelled') return 'danger' as const
  if (status === 'refunded') return 'neutral' as const
  return 'neutral' as const
}

function buildQuery(
  filters: DashboardOrdersFilters,
  patch: Partial<DashboardOrdersFilters>
) {
  const next = { ...filters, ...patch }
  const searchParams = new URLSearchParams()

  if (next.search) searchParams.set('search', next.search)
  if (next.status !== 'all') searchParams.set('status', next.status)
  if (next.page > 1) searchParams.set('page', String(next.page))
  if (next.limit !== 20) searchParams.set('limit', String(next.limit))

  const query = searchParams.toString()
  return query ? `/dashboard/orders?${query}` : '/dashboard/orders'
}

export default async function OrdersListPage({ searchParams }: OrdersPageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const rawParams = await searchParams
  const filters = normalizeDashboardOrdersFilters({
    status: getFirstParam(rawParams.status),
    search: getFirstParam(rawParams.search),
    page: getFirstParam(rawParams.page),
    limit: getFirstParam(rawParams.limit),
  })

  const result = await getDashboardOrders(store.id, filters)
  const hasPrevPage = result.page > 1
  const hasNextPage = result.page < result.totalPages

  return (
    <div className="space-y-6">
      <PageHeader
        title="الطلبات"
        description={`إجمالي الطلبات الحالية: ${result.total}`}
      />

      <div className="flex items-center justify-between gap-4">
        <form method="GET" className="flex-1">
          <FilterBar>
          <Input
            type="text"
            name="search"
            defaultValue={filters.search}
            placeholder="ابحث برقم الطلب أو العميل أو الهاتف..."
            className="md:col-span-2"
          />

          <Select name="status" defaultValue={filters.status}>
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="confirmed">مؤكد</option>
            <option value="processing">قيد التحضير</option>
            <option value="shipped">تم الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغي</option>
            <option value="refunded">مسترجع</option>
          </Select>

          <input type="hidden" name="limit" value={String(filters.limit)} />
          <div className="md:col-span-4">
            <Button type="submit" variant="secondary">تطبيق الفلاتر</Button>
          </div>
        </FilterBar>
      </form>
        <a
          href={`/api/dashboard/orders/export?status=${filters.status}&search=${filters.search}`}
          download
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-[var(--ds-surface-muted)]"
        >
          📥 تصدير CSV
        </a>
      </div>

      {result.orders.length === 0 ? (
        <EmptyState
          title="لا توجد طلبات مطابقة"
          description="جرّب تعديل الفلاتر الحالية أو التحقق من بيانات البحث."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {result.orders.map((order) => (
              <Card key={order.id} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-[var(--ds-text)]">#{order.orderNumber}</p>
                  <StatusPill label={getOrderStatusLabel(order.orderStatus)} tone={getOrderStatusTone(order.orderStatus)} />
                </div>
                <p className="text-sm text-[var(--ds-text)]">{order.customerName}</p>
                <p className="text-xs text-[var(--ds-text-muted)]" dir="ltr">{order.customerPhone}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-[var(--ds-text-muted)]">الإجمالي</p>
                  <p className="text-end font-medium text-[var(--ds-text)]">{formatPrice(Number(order.total), store.settings.currency)}</p>
                  <p className="text-[var(--ds-text-muted)]">حالة الدفع</p>
                  <p className="text-end text-[var(--ds-text)]">{getPaymentStatusLabel(order.paymentStatus)}</p>
                  <p className="text-[var(--ds-text-muted)]">التاريخ</p>
                  <p className="text-end text-[var(--ds-text-muted)]">{formatDate(order.createdAt)}</p>
                </div>
                <Link href={`/dashboard/orders/${order.id}`}>
                  <Button variant="secondary" size="sm">التفاصيل</Button>
                </Link>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">رقم الطلب</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">العميل</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الإجمالي</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">حالة الدفع</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">حالة الطلب</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">التاريخ</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {result.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-medium text-[var(--ds-text)]">#{order.orderNumber}</td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--ds-text)]">{order.customerName}</p>
                        <p className="text-xs text-[var(--ds-text-muted)]" dir="ltr">{order.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--ds-text)]">{formatPrice(Number(order.total), store.settings.currency)}</td>
                      <td className="px-4 py-3 text-[var(--ds-text)]">{getPaymentStatusLabel(order.paymentStatus)}</td>
                      <td className="px-4 py-3">
                        <StatusPill label={getOrderStatusLabel(order.orderStatus)} tone={getOrderStatusTone(order.orderStatus)} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--ds-text-muted)]">{formatDate(order.createdAt)}</td>
                      <td className="px-4 py-3 text-end">
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button variant="secondary" size="sm">التفاصيل</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <PaginationBar
        page={result.page}
        totalPages={result.totalPages}
        summary={`صفحة ${result.page} من ${result.totalPages}`}
        prevHref={hasPrevPage ? buildQuery(filters, { page: result.page - 1 }) : undefined}
        nextHref={hasNextPage ? buildQuery(filters, { page: result.page + 1 }) : undefined}
      />
    </div>
  )
}
