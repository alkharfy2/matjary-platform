import { notFound } from 'next/navigation'
import { and, desc, eq, count } from 'drizzle-orm'
import { db } from '@/db'
import { storeAbandonedCarts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { formatDate, formatPrice } from '@/lib/utils'
import { Card } from '@/components/ui'
import { EmptyState, PageHeader } from '@/components/patterns'
import Link from 'next/link'

type AbandonedCartsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'معلقة', color: 'bg-yellow-100 text-yellow-700' },
  sent: { label: 'تم الإرسال', color: 'bg-blue-100 text-blue-700' },
  recovered: { label: 'تم الاسترجاع', color: 'bg-green-100 text-green-700' },
  expired: { label: 'منتهية', color: 'bg-gray-100 text-gray-500' },
}

export default async function AbandonedCartsPage({ searchParams }: AbandonedCartsPageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const rawParams = await searchParams
  const statusFilter = getFirstParam(rawParams.status) ?? ''
  const page = Math.max(1, parseInt(getFirstParam(rawParams.page) ?? '1'))
  const limit = 20
  const offset = (page - 1) * limit

  const conditions = [eq(storeAbandonedCarts.storeId, store.id)]
  if (statusFilter && ['pending', 'sent', 'recovered', 'expired'].includes(statusFilter)) {
    conditions.push(eq(storeAbandonedCarts.recoveryStatus, statusFilter as 'pending' | 'sent' | 'recovered' | 'expired'))
  }

  const [carts, totalResult, statsResult] = await Promise.all([
    db
      .select()
      .from(storeAbandonedCarts)
      .where(and(...conditions))
      .orderBy(desc(storeAbandonedCarts.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(storeAbandonedCarts)
      .where(and(...conditions)),
    db
      .select({
        status: storeAbandonedCarts.recoveryStatus,
        count: count(),
      })
      .from(storeAbandonedCarts)
      .where(eq(storeAbandonedCarts.storeId, store.id))
      .groupBy(storeAbandonedCarts.recoveryStatus),
  ])

  const total = totalResult[0]?.count ?? 0
  const totalPages = Math.ceil(total / limit)

  const statsMap: Record<string, number> = {}
  for (const row of statsResult) {
    statsMap[row.status] = row.count
  }
  const totalAll = Object.values(statsMap).reduce((s, v) => s + v, 0)
  const recovered = statsMap['recovered'] ?? 0
  const recoveryRate = totalAll > 0 ? Math.round((recovered / totalAll) * 1000) / 10 : 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="السلات المتروكة" description="متابعة واسترجاع السلات المتروكة" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{totalAll}</p>
          <p className="text-sm text-gray-500">الإجمالي</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{statsMap['pending'] ?? 0}</p>
          <p className="text-sm text-gray-500">معلقة</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{statsMap['sent'] ?? 0}</p>
          <p className="text-sm text-gray-500">تم الإرسال</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{recovered}</p>
          <p className="text-sm text-gray-500">تم الاسترجاع</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{recoveryRate}%</p>
          <p className="text-sm text-gray-500">نسبة الاسترجاع</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: '', label: 'الكل' },
          { key: 'pending', label: 'معلقة' },
          { key: 'sent', label: 'تم الإرسال' },
          { key: 'recovered', label: 'تم الاسترجاع' },
          { key: 'expired', label: 'منتهية' },
        ].map((f) => (
          <Link
            key={f.key}
            href={f.key ? `?status=${f.key}` : '?'}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.key || (!statusFilter && f.key === '')
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Cart List */}
      {carts.length === 0 ? (
        <EmptyState title="لا توجد سلات متروكة" description="سيتم عرض السلات المتروكة هنا عند وجودها" />
      ) : (
        <div className="flex flex-col gap-3">
          {carts.map((cart) => {
            const statusInfo = STATUS_LABELS[cart.recoveryStatus] ?? { label: 'معلقة', color: 'bg-yellow-100 text-yellow-700' }
            const itemsData = cart.items as Array<{ productName: string; quantity: number; unitPrice: number }>
            const whatsappMessage = encodeURIComponent(
              store.settings.abandonedCartMessage
                ? store.settings.abandonedCartMessage
                    .replace('{name}', cart.customerName)
                    .replace('{store}', store.name)
                    .replace('{total}', formatPrice(Number(cart.subtotal), store.settings.currency))
                : `مرحباً ${cart.customerName}، سلتك في ${store.name} لسه في انتظارك! كمّل طلبك الآن`,
            )

            return (
              <Card key={cart.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{cart.customerName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500" dir="ltr">{cart.customerPhone}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      📦 {itemsData.length} منتج — {formatPrice(Number(cart.subtotal), store.settings.currency)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(cart.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://wa.me/${cart.customerPhone.replace(/^0/, '20')}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600"
                    >
                      📱 تذكير واتساب
                    </a>
                    {cart.customerEmail && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white">
                        📧 إيميل
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`?${statusFilter ? `status=${statusFilter}&` : ''}page=${page - 1}`}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
            >
              السابق
            </Link>
          )}
          <span className="text-sm text-gray-500">
            صفحة {page} من {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?${statusFilter ? `status=${statusFilter}&` : ''}page=${page + 1}`}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
            >
              التالي
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
