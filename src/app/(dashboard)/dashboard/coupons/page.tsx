'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDate, formatPrice } from '@/lib/utils'

type CouponType = 'percentage' | 'fixed'

type Coupon = {
  id: string
  code: string
  type: CouponType
  value: string
  usageLimit: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

type CouponFormState = {
  code: string
  type: CouponType
  value: string
  expiresAt: string
  usageLimit: string
  isActive: boolean
}

const emptyFormState: CouponFormState = {
  code: '',
  type: 'percentage',
  value: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
}

function getCouponStatus(coupon: Coupon) {
  const now = new Date()
  if (!coupon.isActive) {
    return {
      label: 'غير نشط',
      className: 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]',
    }
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return {
      label: 'منتهي',
      className: 'bg-red-100 text-red-700',
    }
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return {
      label: 'مستنفد',
      className: 'bg-amber-100 text-amber-700',
    }
  }

  return {
    label: 'نشط',
    className: 'bg-green-100 text-green-700',
  }
}

function formatCouponValue(coupon: Coupon) {
  if (coupon.type === 'percentage') {
    return `${Number(coupon.value)}%`
  }

  return formatPrice(Number(coupon.value))
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [form, setForm] = useState<CouponFormState>(emptyFormState)

  const canSubmit = useMemo(() => {
    const numericValue = Number.parseFloat(form.value)
    return form.code.trim().length >= 2 && Number.isFinite(numericValue) && numericValue > 0
  }, [form.code, form.value])

  useEffect(() => {
    void loadCoupons()
  }, [])

  async function loadCoupons() {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch('/api/dashboard/coupons')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحميل الكوبونات')
      }

      setCoupons(data.data as Coupon[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل الكوبونات')
    } finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof CouponFormState>(key: K, value: CouponFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const value = Number.parseFloat(form.value)
      const usageLimit = form.usageLimit.trim()
        ? Number.parseInt(form.usageLimit.trim(), 10)
        : null

      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('قيمة الخصم غير صالحة')
      }

      if (usageLimit !== null && (!Number.isFinite(usageLimit) || usageLimit < 1)) {
        throw new Error('حد الاستخدام يجب أن يكون 1 أو أكثر')
      }

      const response = await fetch('/api/dashboard/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value,
          usageLimit,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          isActive: form.isActive,
          startsAt: null,
          minOrderAmount: null,
          maxDiscount: null,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر إنشاء الكوبون')
      }

      setForm(emptyFormState)
      setSuccessMessage('تم إنشاء الكوبون بنجاح')
      await loadCoupons()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إنشاء الكوبون')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">كوبونات الخصم</h1>
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

      <form onSubmit={handleSubmit} className="card-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">إنشاء كوبون جديد</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">كود الكوبون</label>
            <input
              type="text"
              value={form.code}
              onChange={(event) => updateForm('code', event.target.value.toUpperCase())}
              placeholder="SAVE10"
              dir="ltr"
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">نوع الخصم</label>
            <select
              value={form.type}
              onChange={(event) => updateForm('type', event.target.value as CouponType)}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            >
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">قيمة ثابتة</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">قيمة الخصم</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.value}
              onChange={(event) => updateForm('value', event.target.value)}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              required
            />
            {form.type === 'percentage' ? (
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">القيمة كنسبة مئوية (حتى 100)</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">حد أقصى للاستخدام</label>
            <input
              type="number"
              min="1"
              value={form.usageLimit}
              onChange={(event) => updateForm('usageLimit', event.target.value)}
              placeholder="اختياري"
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">تاريخ الانتهاء</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) => updateForm('expiresAt', event.target.value)}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">الحالة</label>
            <select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(event) => updateForm('isActive', event.target.value === 'active')}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
          >
            {saving ? 'جاري الإنشاء...' : 'إنشاء الكوبون'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden card-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
          <thead className="bg-[var(--ds-surface-muted)]">
            <tr>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الكود</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">نوع الخصم</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">القيمة</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الاستخدام</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">ينتهي في</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الحالة</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--ds-text-muted)]">
                  جاري تحميل الكوبونات...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--ds-text-muted)]">
                  لا توجد كوبونات بعد.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => {
                const status = getCouponStatus(coupon)
                return (
                  <tr key={coupon.id} className="border-t border-[var(--ds-border)]/70">
                    <td className="px-4 py-3 font-medium" dir="ltr">
                      {coupon.code}
                    </td>
                    <td className="px-4 py-3">
                      {coupon.type === 'percentage' ? 'نسبة مئوية' : 'قيمة ثابتة'}
                    </td>
                    <td className="px-4 py-3">{formatCouponValue(coupon)}</td>
                    <td className="px-4 py-3">
                      {coupon.usageLimit === null
                        ? `${coupon.usedCount} / بدون حد`
                        : `${coupon.usedCount} / ${coupon.usageLimit}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--ds-text-muted)]">
                      {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'بدون تاريخ انتهاء'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--ds-text-muted)]">
                      {formatDate(coupon.createdAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}




