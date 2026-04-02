'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'

type Product = {
  id: string
  name: string
  price: string
  images: string[]
}

type UpsellRule = {
  rule: {
    id: string
    storeId: string
    triggerProductId: string | null
    offerProductId: string
    discountType: 'percentage' | 'fixed'
    discountValue: string
    isActive: boolean
    sortOrder: number
    createdAt: string
    updatedAt: string
  }
  offerProduct: {
    id: string
    name: string
    price: string
    images: string[]
  }
}

interface UpsellClientProps {
  initialRules: UpsellRule[]
  initialProducts: Product[]
}

export default function UpsellClient({ initialRules, initialProducts }: UpsellClientProps) {
  const [rules, setRules] = useState<UpsellRule[]>(initialRules)
  const products = initialProducts
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [triggerProductId, setTriggerProductId] = useState('')
  const [offerProductId, setOfferProductId] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/upsell')
      const data = await res.json()
      if (data.success) {
        setRules(data.data)
      }
    } catch {
      // Silently fail — data is stale but page still works
    }
  }, [])

  function resetForm() {
    setTriggerProductId('')
    setOfferProductId('')
    setDiscountType('percentage')
    setDiscountValue('')
    setIsActive(true)
    setSortOrder('0')
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(rule: UpsellRule) {
    setTriggerProductId(rule.rule.triggerProductId ?? '')
    setOfferProductId(rule.rule.offerProductId)
    setDiscountType(rule.rule.discountType)
    setDiscountValue(String(Number(rule.rule.discountValue)))
    setIsActive(rule.rule.isActive)
    setSortOrder(String(rule.rule.sortOrder))
    setEditingId(rule.rule.id)
    setShowForm(true)
  }

  async function handleSubmit() {
    setError(null)
    setNotice(null)

    if (!offerProductId) {
      setError('يجب اختيار منتج العرض')
      return
    }

    const parsedValue = Number(discountValue)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError('قيمة الخصم غير صالحة')
      return
    }

    setSaving(true)

    try {
      const payload = {
        triggerProductId: triggerProductId || null,
        offerProductId,
        discountType,
        discountValue: parsedValue,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      }

      const url = editingId ? `/api/dashboard/upsell/${editingId}` : '/api/dashboard/upsell'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'حدث خطأ')
        return
      }

      setNotice(editingId ? 'تم تحديث القاعدة بنجاح' : 'تم إنشاء القاعدة بنجاح')
      resetForm()
      await fetchRules()
    } catch {
      setError('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه القاعدة؟')) return

    try {
      const res = await fetch(`/api/dashboard/upsell/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setNotice('تم حذف القاعدة')
        await fetchRules()
      } else {
        setError(data.error || 'تعذر الحذف')
      }
    } catch {
      setError('حدث خطأ أثناء الحذف')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">عروض الـ Upsell</h1>
          <p className="text-sm text-[var(--ds-text-muted)]">
            اعرض منتجات بخصم بعد إتمام الطلب لزيادة متوسط قيمة السلة.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--ds-primary-hover)]"
        >
          + إضافة قاعدة
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
      )}

      {showForm && (
        <div className="card-surface space-y-4 p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{editingId ? 'تعديل القاعدة' : 'قاعدة جديدة'}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">المنتج المُحفِّز (اختياري)</label>
              <select
                value={triggerProductId}
                onChange={(e) => setTriggerProductId(e.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              >
                <option value="">أي منتج (الكل)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
                اتركه فارغاً ليظهر العرض مع أي طلب.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">منتج العرض *</label>
              <select
                value={offerProductId}
                onChange={(e) => setOfferProductId(e.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              >
                <option value="">اختر منتج...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {formatPrice(Number(p.price))}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">نوع الخصم</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              >
                <option value="percentage">نسبة مئوية %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">قيمة الخصم</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">ترتيب العرض</label>
              <input
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              />
            </div>

            <label className="flex items-center gap-2 self-end py-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--ds-border)]"
              />
              <span className="text-sm font-medium">نشط</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="rounded-lg bg-[var(--ds-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'حفظ'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-[var(--ds-border)] px-5 py-2 text-sm hover:bg-[var(--ds-surface-muted)]"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="card-surface px-6 py-12 text-center text-[var(--ds-text-muted)]">
          <p className="text-lg font-medium">لا توجد قواعد Upsell بعد</p>
          <p className="mt-1 text-sm">أنشئ أول قاعدة لعرض منتجات بخصم بعد إتمام الطلب.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((item) => {
            const triggerProduct = products.find((p) => p.id === item.rule.triggerProductId)
            const discountLabel = item.rule.discountType === 'percentage'
              ? `${Number(item.rule.discountValue)}%`
              : `${formatPrice(Number(item.rule.discountValue))}`

            return (
              <div
                key={item.rule.id}
                className="card-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  {item.offerProduct.images[0] && (
                    <div className="h-14 w-14 overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]">
                      <Image
                        src={item.offerProduct.images[0]}
                        alt={item.offerProduct.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[var(--ds-text)]">{item.offerProduct.name}</p>
                    <p className="text-xs text-[var(--ds-text-muted)]">
                      {triggerProduct ? `عند شراء: ${triggerProduct.name}` : 'عند شراء أي منتج'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-green-600">خصم {discountLabel}</span>
                      {' · '}
                      <span className={item.rule.isActive ? 'text-green-600' : 'text-gray-400'}>
                        {item.rule.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => void handleDelete(item.rule.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    حذف
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
