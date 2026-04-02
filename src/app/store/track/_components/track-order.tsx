'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getTrackingUrl } from '@/lib/shipping/tracking-urls'

type TimelineItem = {
  status: string
  label: string
  date: string | null
  active: boolean
}

type OrderItem = {
  name: string
  quantity: number
  price: string
  total: string
  image: string | null
}

type TrackingResult = {
  orderNumber: string
  orderStatus: string
  paymentMethod: string
  paymentStatus: string
  total: string
  currency: string
  trackingNumber: string | null
  shippingCompany: string | null
  timeline: TimelineItem[]
  items: OrderItem[]
  createdAt: string
}

const statusIcons: Record<string, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'في الانتظار',
    confirmed: 'مؤكد',
    processing: 'قيد التحضير',
    shipped: 'تم الشحن',
    delivered: 'تم التوصيل',
    cancelled: 'ملغي',
  }
  return labels[status] ?? status
}

export function TrackOrder({ currency: _currency }: { currency: string }) {
  const searchParams = useSearchParams()
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTrack = async () => {
    if (!orderNumber.trim() || !phone.trim()) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/storefront/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: phone.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
      } else {
        setError(json.error || 'حدث خطأ')
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:color-mix(in_oklab,var(--color-primary,#000)_10%,var(--ds-surface-elevated))]">
          <Search className="h-6 w-6" style={{ color: 'var(--color-primary, #000)' }} />
        </div>
        <h1 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">تتبع طلبك</h1>
        <p className="text-sm text-[var(--ds-text-muted)]">أدخل رقم الطلب ورقم هاتفك لمعرفة حالة طلبك</p>
      </div>

      {/* Search Form */}
      <div className="surface-panel-elevated space-y-4 rounded-2xl p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">رقم الطلب</label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="مثال: ORD-001"
            className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)]"
            dir="ltr"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">رقم الهاتف</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)]"
            dir="ltr"
          />
        </div>
        <button
          onClick={handleTrack}
          disabled={loading || !orderNumber.trim() || !phone.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          {loading ? (
            <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? 'جاري البحث...' : 'تتبع الطلب'}
        </button>
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Order Info */}
          <div className="surface-panel-elevated rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--ds-text-soft)]">رقم الطلب</p>
                <p className="text-lg font-bold text-[var(--ds-text)]" dir="ltr">{result.orderNumber}</p>
              </div>
              <div className="text-end">
                <p className="text-xs text-[var(--ds-text-soft)]">الإجمالي</p>
                <p className="text-lg font-bold" style={{ color: 'var(--color-primary, #000)' }}>
                  {formatPrice(Number(result.total), result.currency)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                result.orderStatus === 'delivered' ? 'bg-green-50 text-green-700' :
                result.orderStatus === 'cancelled' ? 'bg-red-50 text-red-700' :
                result.orderStatus === 'shipped' ? 'bg-blue-50 text-blue-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                {getStatusLabel(result.orderStatus)}
              </span>
              <span className="text-xs text-[var(--ds-text-soft)]">
                {new Date(result.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {/* Tracking number */}
            {result.trackingNumber && (
              <div className="mt-4 rounded-xl bg-[var(--ds-surface-muted)] p-3">
                <p className="text-xs text-[var(--ds-text-soft)]">رقم التتبع</p>
                <p className="font-mono text-sm font-semibold text-[var(--ds-text)]" dir="ltr">
                  {result.trackingNumber}
                </p>
                {result.shippingCompany && (
                  <p className="mt-0.5 text-xs text-[var(--ds-text-muted)]">
                    شركة الشحن: {result.shippingCompany}
                  </p>
                )}
                {result.shippingCompany && (() => {
                  const url = getTrackingUrl(result.shippingCompany!, result.trackingNumber!)
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
                      style={{ backgroundColor: 'var(--color-primary, #000)' }}
                    >
                      تتبع الشحنة ↗
                    </a>
                  ) : null
                })()}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="surface-panel-elevated rounded-2xl p-6">
            <h2 className="mb-4 font-semibold text-[var(--ds-text)]">حالة الطلب</h2>
            <div className="space-y-0">
              {result.timeline.map((step, i) => {
                const Icon = statusIcons[step.status] ?? Clock
                const isLast = i === result.timeline.length - 1
                const isCancelled = step.status === 'cancelled'
                return (
                  <div key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isCancelled
                            ? 'bg-red-100 text-red-600'
                            : step.active
                              ? 'text-white'
                              : 'bg-gray-100 text-gray-300'
                        }`}
                        style={
                          step.active && !isCancelled
                            ? { backgroundColor: 'var(--color-primary, #000)' }
                            : undefined
                        }
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isLast && (
                        <div
                          className={`h-8 w-0.5 ${step.active ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-semibold ${step.active ? 'text-[var(--ds-text)]' : 'text-[var(--ds-text-soft)]'}`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-xs text-[var(--ds-text-soft)]">
                          {new Date(step.date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Items */}
          <div className="surface-panel-elevated rounded-2xl p-6">
            <h2 className="mb-4 font-semibold text-[var(--ds-text)]">محتويات الطلب</h2>
            <div className="divide-y divide-[var(--ds-divider)]">
              {result.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--ds-text)]">{item.name}</p>
                    <p className="text-xs text-[var(--ds-text-soft)]">
                      {formatPrice(Number(item.price), result.currency)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--ds-text)]">
                    {formatPrice(Number(item.total), result.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
