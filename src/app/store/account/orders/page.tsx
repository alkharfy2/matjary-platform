'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import { formatPrice } from '@/lib/utils'
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react'

type OrderItem = {
  id: string
  name: string
  image: string | null
  quantity: number
  price: string
  variantOptions: { name: string; value: string }[] | null
}

type Order = {
  id: string
  orderNumber: string
  orderStatus: string
  total: string
  createdAt: string
  items: OrderItem[]
}

const STATUS_MAP: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'قيد المراجعة', icon: Clock, className: 'text-amber-600 bg-amber-50 border-amber-200' },
  confirmed: { label: 'تم التأكيد', icon: CheckCircle, className: 'text-blue-600 bg-blue-50 border-blue-200' },
  processing: { label: 'جاري التجهيز', icon: Package, className: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  shipped: { label: 'تم الشحن', icon: Truck, className: 'text-purple-600 bg-purple-50 border-purple-200' },
  delivered: { label: 'تم التسليم', icon: CheckCircle, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'ملغى', icon: XCircle, className: 'text-rose-600 bg-rose-50 border-rose-200' },
}

export default function OrdersPage() {
  const store = useStore()
  const currency = store.settings.currency ?? 'EGP'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadOrders() {
      try {
        const res = await fetch('/api/storefront/auth/orders')
        const data = await res.json()
        if (!cancelled && data?.success) {
          setOrders(data.data?.orders ?? [])
        }
      } catch { /* handled by layout */ } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadOrders()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary,#000)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel-elevated rounded-[28px] p-6">
        <h1 className="ds-heading text-2xl font-black text-[var(--ds-text)]">طلباتي</h1>
        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
          {orders.length > 0 ? `لديك ${orders.length} طلب` : 'لم تقم بأي طلبات بعد'}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="surface-panel-elevated flex flex-col items-center gap-4 rounded-[28px] p-10">
          <Package className="h-16 w-16 text-[var(--ds-text-soft)]" />
          <p className="text-[var(--ds-text-muted)]">لم تقم بأي طلبات بعد</p>
          <Link
            href={storePath('/', { storeSlug: store.slug })}
            className="rounded-[20px] px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow)]"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_MAP[order.orderStatus] ?? STATUS_MAP.pending!
            const StatusIcon = statusInfo!.icon

            return (
              <div key={order.id} className="surface-panel-elevated overflow-hidden rounded-[24px]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ds-border)]/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[var(--ds-text)]">
                      طلب #{order.orderNumber}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo!.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo!.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--ds-text-soft)]">
                    <span>{new Date(order.createdAt).toLocaleDateString('ar-EG')}</span>
                    <span className="font-bold text-[var(--ds-text)]">
                      {formatPrice(Number(order.total), currency)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-[var(--ds-border)]/50 px-5">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-12 w-12 rounded-xl border border-[var(--ds-border)] object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ds-surface-muted)] text-xs text-[var(--ds-text-soft)]">
                          📦
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--ds-text)]">
                          {item.name}
                        </p>
                        {item.variantOptions && item.variantOptions.length > 0 && (
                          <p className="text-xs text-[var(--ds-text-soft)]">{item.variantOptions.map(v => v.value).join(' / ')}</p>
                        )}
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold text-[var(--ds-text)]">
                          {formatPrice(Number(item.price) * item.quantity, currency)}
                        </p>
                        <p className="text-xs text-[var(--ds-text-soft)]">×{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <p className="py-2 text-center text-xs text-[var(--ds-text-soft)]">
                      +{order.items.length - 3} منتجات أخرى
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
