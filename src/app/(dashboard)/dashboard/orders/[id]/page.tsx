'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Clock, CreditCard, Loader2, MapPin, Package, Save, User, LockKeyhole } from 'lucide-react'

type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  processing: 'قيد التحضير',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  refunded: 'مسترجع',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-[var(--ds-surface-muted)] text-[var(--ds-primary)]',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]',
}

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

const PAYMENT_STATUS_MAP: Record<string, string> = {
  pending: 'في انتظار الدفع',
  awaiting_payment: 'في انتظار الدفع',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مسترجع',
}

type OrderItem = {
  id: string
  name: string
  price: string
  quantity: number
  total: string
  image: string | null
  variantOptions: Array<{ name: string; value: string }> | null
}

type Customer = {
  id: string
  name: string
  phone: string
  email: string | null
  totalOrders: number
  totalSpent: string
} | null

type Order = {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  shippingAddress: {
    governorate: string
    city: string
    area: string
    street: string
    building?: string
    floor?: string
    apartment?: string
  }
  subtotal: string
  shippingCost: string
  discount: string
  total: string
  couponCode: string | null
  paymentMethod: string
  paymentStatus: string
  orderStatus: OrderStatus
  notes: string | null
  internalNotes: string | null
  trackingNumber: string | null
  blurred: boolean
  orderFee?: string | null
  currentBalance?: string
  shippingCompany: string | null
  createdAt: string
  items: OrderItem[]
  customer: Customer
}

function formatMoney(value: string) {
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return '0.00 ج.م'
  return `${number.toFixed(2)} ج.م`
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippingCompany, setShippingCompany] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  useEffect(() => {
    let active = true

    async function fetchOrder() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const response = await fetch(`/api/dashboard/orders/${orderId}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'تعذر تحميل بيانات الطلب')
        }

        if (!active) return
        const currentOrder = data.data as Order

        setOrder(currentOrder)
        // إذا كان الطلب محجوب لا نجهّز حقول التحرير
        if (!currentOrder.blurred) {
          setOrderStatus(currentOrder.orderStatus)
          setTrackingNumber(currentOrder.trackingNumber ?? '')
          setShippingCompany(currentOrder.shippingCompany ?? '')
          setInternalNotes(currentOrder.internalNotes ?? '')
        } else {
          setOrderStatus(currentOrder.orderStatus ?? 'pending')
        }
      } catch (error) {
        if (!active) return
        setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات الطلب')
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchOrder()

    return () => {
      active = false
    }
  }, [orderId])

  const availableStatuses = useMemo(() => {
    if (!order) return ['pending'] as OrderStatus[]
    return [order.orderStatus, ...ORDER_STATUS_TRANSITIONS[order.orderStatus]]
  }, [order])

  async function handleUpdateStatus() {
    if (!order) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/dashboard/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus,
          trackingNumber: trackingNumber || null,
          shippingCompany: shippingCompany || null,
          internalNotes: internalNotes || null,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحديث حالة الطلب')
      }

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              orderStatus,
              trackingNumber: trackingNumber || null,
              shippingCompany: shippingCompany || null,
              internalNotes: internalNotes || null,
              paymentStatus: orderStatus === 'refunded' ? 'refunded' : prev.paymentStatus,
            }
          : prev
      )
      setSuccessMessage('تم تحديث حالة الطلب بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة الطلب')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--ds-text-muted)]/80" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-[var(--ds-text)]">الطلب غير موجود</h2>
        <Link href="/dashboard/orders" className="mt-4 inline-block text-[var(--ds-primary)]">
          العودة للطلبات
        </Link>
      </div>
    )
  }

  // ---- حالة Blur: رصيد غير كافٍ ----
  if (order.blurred) {
    const fee = order.orderFee ? parseFloat(order.orderFee) : null
    const bal = order.currentBalance ? parseFloat(order.currentBalance) : 0
    const needed = fee !== null ? Math.max(0, fee - bal) : null

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders" className="rounded-lg p-2 transition hover:bg-gray-100">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">الطلب #{order.orderNumber}</h1>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="relative rounded-xl border bg-white">
          {/* بيانات مرئية */}
          <div className="p-6 pb-2 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-gray-500">رقم الطلب</p>
              <p className="font-semibold">#{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">إجمالي الطلب</p>
              <p className="font-semibold">{formatMoney(order.total)}</p>
            </div>
            <div>
              <p className="text-gray-500">حالة الطلب</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.orderStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
              </span>
            </div>
          </div>

          {/* Blur overlay */}
          <div className="relative mx-6 mb-6 mt-4 rounded-xl overflow-hidden">
            {/* محتوى مزيّف (مضبّب) */}
            <div className="blur-sm select-none pointer-events-none p-6 space-y-3 bg-gray-50 rounded-xl">
              <div className="h-4 w-3/4 rounded bg-gray-300" />
              <div className="h-4 w-1/2 rounded bg-gray-300" />
              <div className="h-4 w-2/3 rounded bg-gray-300" />
              <div className="h-4 w-1/3 rounded bg-gray-300" />
              <div className="h-4 w-3/5 rounded bg-gray-300" />
            </div>

            {/* Overlay رسالة */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl px-4 text-center">
              <LockKeyhole className="mb-3 h-10 w-10 text-gray-400" />
              <h3 className="mb-1 text-lg font-bold text-gray-800">بيانات مخفية</h3>
              <p className="mb-0.5 text-sm text-gray-500">
                تحتاج رصيداً كافياً لعرض تفاصيل العميل والعنوان.
              </p>
              {fee !== null && (
                <p className="mb-4 text-sm text-gray-600">
                  رسوم الطلب:{' '}
                  <span className="font-semibold">{fee.toFixed(2)} ج.م</span>
                  {' · '}رصيدك:{' '}
                  <span className="font-semibold">{bal.toFixed(2)} ج.م</span>
                  {needed !== null && needed > 0 && (
                    <>
                      {' · '}تحتاج:{' '}
                      <span className="font-semibold text-red-600">{needed.toFixed(2)} ج.م</span>
                    </>
                  )}
                </p>
              )}
              <button
                onClick={() => router.push('/dashboard/wallet')}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                شحن الرصيد الآن
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statusLabel = STATUS_LABELS[order.orderStatus] ?? order.orderStatus
  const statusColor = STATUS_COLORS[order.orderStatus] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]'
  const paymentLabel = PAYMENT_STATUS_MAP[order.paymentStatus] ?? order.paymentStatus

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders" className="rounded-lg p-2 transition hover:bg-[var(--ds-surface-muted)]">
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">الطلب #{order.orderNumber}</h1>
            <p className="text-sm text-[var(--ds-text-muted)]">
              {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor}`}>
            {statusLabel}
          </span>
          <Link
            href={`/dashboard/orders/${orderId}/invoice`}
            target="_blank"
            className="rounded-lg border px-3 py-1 text-sm transition hover:bg-[var(--ds-surface-muted)]"
          >
            🧾 طباعة فاتورة
          </Link>
          <Link
            href={`/dashboard/orders/${orderId}/shipping-label`}
            target="_blank"
            className="rounded-lg border px-3 py-1 text-sm transition hover:bg-[var(--ds-surface-muted)]"
          >
            📦 طباعة بوليصة شحن
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <Package className="h-5 w-5" />
              المنتجات
            </h2>

            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 rounded-lg bg-[var(--ds-surface-muted)] object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--ds-surface-muted)]">
                      <Package className="h-6 w-6 text-gray-300" />
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.variantOptions && item.variantOptions.length > 0 ? (
                      <p className="text-sm text-[var(--ds-text-muted)]">
                        {item.variantOptions.map((v) => `${v.name}: ${v.value}`).join(' / ')}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--ds-text-muted)]">
                      {item.quantity} x {formatMoney(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(item.total)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ds-text-muted)]">المجموع الفرعي</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ds-text-muted)]">الشحن</span>
                <span>{formatMoney(order.shippingCost)}</span>
              </div>
              {Number.parseFloat(order.discount) > 0 ? (
                <div className="flex justify-between text-sm text-green-600">
                  <span>الخصم {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span>-{formatMoney(order.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>الإجمالي</span>
                <span>{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="card-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <CreditCard className="h-5 w-5" />
              معلومات الدفع
            </h2>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <p>
                <span className="text-[var(--ds-text-muted)]">طريقة الدفع:</span>{' '}
                <span className="font-medium">
                  {order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'Kashier'}
                </span>
              </p>
              <p>
                <span className="text-[var(--ds-text-muted)]">حالة الدفع:</span>{' '}
                <span className="font-medium">{paymentLabel}</span>
              </p>
            </div>
            {order.notes ? (
              <div className="mt-4 rounded-lg bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">
                  <strong>ملاحظات العميل:</strong> {order.notes}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 card-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Clock className="h-5 w-5" />
              تحديث الحالة
            </h2>

            <select
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value as OrderStatus)}
              aria-label="حالة الطلب"
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-[var(--ds-primary)] focus:ring-2 focus:ring-[var(--ds-primary)]/25"
            >
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {(orderStatus === 'shipped' || orderStatus === 'delivered') ? (
              <>
                <div>
                  <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">شركة الشحن</label>
                  <input
                    type="text"
                    value={shippingCompany}
                    onChange={(event) => setShippingCompany(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="مثال: أرامكس"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">رقم التتبع</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    aria-label="رقم التتبع"
                    dir="ltr"
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">ملاحظات داخلية</label>
              <textarea
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                rows={3}
                aria-label="ملاحظات داخلية"
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={handleUpdateStatus}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ds-primary)] py-2 text-white transition hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ التحديث
            </button>
          </div>

          <div className="space-y-3 card-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <User className="h-5 w-5" />
              معلومات العميل
            </h2>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-[var(--ds-text-muted)]">الاسم:</span> {order.customerName}
              </p>
              <p>
                <span className="text-[var(--ds-text-muted)]">الهاتف:</span>{' '}
                <span dir="ltr">{order.customerPhone}</span>
              </p>
              {order.customerEmail ? (
                <p>
                  <span className="text-[var(--ds-text-muted)]">البريد:</span> {order.customerEmail}
                </p>
              ) : null}
              {order.customer ? (
                <div className="mt-2 border-t pt-2">
                  <p className="text-[var(--ds-text-muted)]">إجمالي الطلبات: {order.customer.totalOrders}</p>
                  <p className="text-[var(--ds-text-muted)]">
                    إجمالي المصروف: {formatMoney(order.customer.totalSpent)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 card-surface p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-5 w-5" />
              عنوان الشحن
            </h2>
            <div className="space-y-1 text-sm">
              <p>
                {order.shippingAddress.governorate} - {order.shippingAddress.city}
              </p>
              <p>{order.shippingAddress.area}</p>
              <p>{order.shippingAddress.street}</p>
              {order.shippingAddress.building ? <p>مبنى: {order.shippingAddress.building}</p> : null}
              {order.shippingAddress.floor ? <p>الطابق: {order.shippingAddress.floor}</p> : null}
              {order.shippingAddress.apartment ? <p>شقة: {order.shippingAddress.apartment}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


