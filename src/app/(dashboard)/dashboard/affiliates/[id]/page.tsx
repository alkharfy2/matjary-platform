import { db } from '@/db'
import { storeAffiliates, storeAffiliateSales, storeOrders } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export default async function AffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/affiliates' })
  if (access.status !== 'ok') redirect('/dashboard')
  const { store } = access
  const { id } = await params

  const [affiliate] = await db
    .select()
    .from(storeAffiliates)
    .where(and(eq(storeAffiliates.id, id), eq(storeAffiliates.storeId, store.id)))
    .limit(1)

  if (!affiliate) notFound()

  const sales = await db
    .select({
      id: storeAffiliateSales.id,
      orderId: storeAffiliateSales.orderId,
      saleAmount: storeAffiliateSales.saleAmount,
      commissionAmount: storeAffiliateSales.commissionAmount,
      status: storeAffiliateSales.status,
      createdAt: storeAffiliateSales.createdAt,
      orderNumber: storeOrders.orderNumber,
    })
    .from(storeAffiliateSales)
    .leftJoin(storeOrders, eq(storeAffiliateSales.orderId, storeOrders.id))
    .where(and(
      eq(storeAffiliateSales.affiliateId, id),
      eq(storeAffiliateSales.storeId, store.id),
    ))
    .orderBy(desc(storeAffiliateSales.createdAt))

  const statusLabels: Record<string, string> = {
    pending: 'معلقة',
    approved: 'معتمدة',
    paid: 'مدفوعة',
    cancelled: 'ملغاة',
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/affiliates"
            className="text-sm hover:underline"
            style={{ color: 'var(--ds-text-muted)' }}
          >
            ← العودة للمسوقين
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{affiliate.name}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          affiliate.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
          {affiliate.isActive ? 'نشط' : 'معطل'}
        </span>
      </div>

      {/* Info */}
      <div className="card-surface grid grid-cols-2 gap-4 rounded-lg border p-4 md:grid-cols-4" style={{ borderColor: 'var(--ds-border)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>الكود</p>
          <p className="mt-0.5 font-mono font-medium">{affiliate.code}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>العمولة</p>
          <p className="mt-0.5 font-medium">{affiliate.commissionRate}%</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>الهاتف</p>
          <p className="mt-0.5 font-medium">{affiliate.phone}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>الإيميل</p>
          <p className="mt-0.5 font-medium">{affiliate.email || '-'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>إجمالي المبيعات</p>
          <p className="mt-1 text-xl font-bold">{Number(affiliate.totalSales).toFixed(2)} EGP</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>إجمالي العمولات</p>
          <p className="mt-1 text-xl font-bold">{Number(affiliate.totalCommission).toFixed(2)} EGP</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>عمولات معلقة</p>
          <p className="mt-1 text-xl font-bold">{Number(affiliate.pendingCommission).toFixed(2)} EGP</p>
        </div>
      </div>

      {/* Sales Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">المبيعات</h2>
        <div className="card-surface overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ds-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <th className="px-4 py-3 text-right font-medium">الطلب</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">العمولة</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--ds-text-muted)' }}>
                    لا توجد مبيعات حتى الآن
                  </td>
                </tr>
              )}
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/orders/${sale.orderId}`}
                      className="hover:underline"
                      style={{ color: 'var(--ds-primary)' }}
                    >
                      #{sale.orderNumber || sale.orderId?.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{Number(sale.saleAmount).toFixed(2)} EGP</td>
                  <td className="px-4 py-3">{Number(sale.commissionAmount).toFixed(2)} EGP</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[sale.status] || ''}`}>
                      {statusLabels[sale.status] || sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>
                    {new Date(sale.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
