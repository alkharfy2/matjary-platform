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
  firstOrderOnly: boolean
  isFreeShipping: boolean
  autoApply: boolean
  usagePerCustomer: number | null
}

type CouponFormState = {
  code: string
  type: CouponType
  value: string
  expiresAt: string
  usageLimit: string
  isActive: boolean
  firstOrderOnly: boolean
  isFreeShipping: boolean
  autoApply: boolean
  usagePerCustomer: string
  applicableProductIds: string[]
  applicableCategoryIds: string[]
}

type SimpleProduct = { id: string; name: string }
type SimpleCategory = { id: string; name: string }

const emptyFormState: CouponFormState = {
  code: '',
  type: 'percentage',
  value: '',
  expiresAt: '',
  usageLimit: '',
  isActive: true,
  firstOrderOnly: false,
  isFreeShipping: false,
  autoApply: false,
  usagePerCustomer: '',
  applicableProductIds: [],
  applicableCategoryIds: [],
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
  const [allProducts, setAllProducts] = useState<SimpleProduct[]>([])
  const [allCategories, setAllCategories] = useState<SimpleCategory[]>([])

  const canSubmit = useMemo(() => {
    const numericValue = Number.parseFloat(form.value)
    return form.code.trim().length >= 2 && Number.isFinite(numericValue) && numericValue > 0
  }, [form.code, form.value])

  useEffect(() => {
    void loadCoupons()
    void loadProductsAndCategories()
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

  async function loadProductsAndCategories() {
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/dashboard/products?limit=200'),
        fetch('/api/dashboard/categories'),
      ])
      const prodData = await prodRes.json()
      const catData = await catRes.json()

      if (prodData.success && prodData.data?.products) {
        setAllProducts(
          (prodData.data.products as Array<{ id: string; name: string }>).map((p) => ({
            id: p.id,
            name: p.name,
          }))
        )
      }
      if (catData.success && Array.isArray(catData.data)) {
        setAllCategories(
          (catData.data as Array<{ id: string; name: string }>).map((c) => ({
            id: c.id,
            name: c.name,
          }))
        )
      }
    } catch {
      // non-critical, ignore
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
          firstOrderOnly: form.firstOrderOnly,
          isFreeShipping: form.isFreeShipping,
          autoApply: form.autoApply,
          usagePerCustomer: form.usagePerCustomer.trim()
            ? Number.parseInt(form.usagePerCustomer.trim(), 10)
            : null,
          applicableProductIds: form.applicableProductIds,
          applicableCategoryIds: form.applicableCategoryIds,
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

          <div>
            <label className="mb-1 block text-sm font-medium">حد الاستخدام لكل عميل</label>
            <input
              type="number"
              min="1"
              value={form.usagePerCustomer}
              onChange={(event) => updateForm('usagePerCustomer', event.target.value)}
              placeholder="اختياري"
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.firstOrderOnly}
              onChange={(event) => updateForm('firstOrderOnly', event.target.checked)}
              className="h-4 w-4 rounded border-[var(--ds-border)]"
            />
            أول طلب فقط
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFreeShipping}
              onChange={(event) => updateForm('isFreeShipping', event.target.checked)}
              className="h-4 w-4 rounded border-[var(--ds-border)]"
            />
            شحن مجاني
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.autoApply}
              onChange={(event) => updateForm('autoApply', event.target.checked)}
              className="h-4 w-4 rounded border-[var(--ds-border)]"
            />
            تطبيق تلقائي
          </label>
        </div>

        {/* Product/Category Picker */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">ينطبق على منتجات محددة (اختياري)</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--ds-border)] p-2">
              {allProducts.length === 0 ? (
                <p className="text-xs text-[var(--ds-text-muted)] py-2 text-center">لا توجد منتجات</p>
              ) : (
                allProducts.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.applicableProductIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateForm('applicableProductIds', [...form.applicableProductIds, product.id])
                        } else {
                          updateForm('applicableProductIds', form.applicableProductIds.filter((id) => id !== product.id))
                        }
                      }}
                      className="h-4 w-4 rounded border-[var(--ds-border)]"
                    />
                    {product.name}
                  </label>
                ))
              )}
            </div>
            {form.applicableProductIds.length > 0 && (
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                تم اختيار {form.applicableProductIds.length} منتج
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">ينطبق على تصنيفات محددة (اختياري)</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--ds-border)] p-2">
              {allCategories.length === 0 ? (
                <p className="text-xs text-[var(--ds-text-muted)] py-2 text-center">لا توجد تصنيفات</p>
              ) : (
                allCategories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.applicableCategoryIds.includes(category.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateForm('applicableCategoryIds', [...form.applicableCategoryIds, category.id])
                        } else {
                          updateForm('applicableCategoryIds', form.applicableCategoryIds.filter((id) => id !== category.id))
                        }
                      }}
                      className="h-4 w-4 rounded border-[var(--ds-border)]"
                    />
                    {category.name}
                  </label>
                ))
              )}
            </div>
            {form.applicableCategoryIds.length > 0 && (
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                تم اختيار {form.applicableCategoryIds.length} تصنيف
              </p>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
          اترك الاختيار فارغاً ليتم تطبيق الكوبون على كل المنتجات.
        </p>

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
                      <div className="flex items-center gap-2">
                        {coupon.code}
                        {coupon.autoApply ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">تلقائي</span> : null}
                        {coupon.firstOrderOnly ? <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">أول طلب</span> : null}
                        {coupon.isFreeShipping ? <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] text-teal-700">شحن مجاني</span> : null}
                      </div>
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




