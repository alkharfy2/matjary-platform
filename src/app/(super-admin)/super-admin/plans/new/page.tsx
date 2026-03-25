'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Check, ArrowRight } from 'lucide-react'
import { MostPopularPlanNotice } from '../_components/most-popular-plan-notice'

type ExistingPlan = {
  id: string
  name: string
  priceMonthly: string
  maxProducts: number | null
  maxOrdersPerMonth: number | null
  isMostPopular: boolean
}

type PlanForm = {
  id: string
  name: string
  nameEn: string
  priceMonthly: string
  priceYearly: string
  orderFee: string
  maxProducts: string
  maxOrdersPerMonth: string
  features: string
  isMostPopular: boolean
  isActive: boolean
  sortOrder: string
}

const emptyForm: PlanForm = {
  id: '',
  name: '',
  nameEn: '',
  priceMonthly: '0',
  priceYearly: '',
  orderFee: '',
  maxProducts: '',
  maxOrdersPerMonth: '',
  features: '',
  isMostPopular: false,
  isActive: true,
  sortOrder: '0',
}

export default function NewPlanPage() {
  const router = useRouter()
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [currentMostPopularPlan, setCurrentMostPopularPlan] = useState<ExistingPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    fetch('/api/admin/plans')
      .then((response) => response.json())
      .then((json) => {
        if (!isMounted || !json.success) return

        const plans = json.data as ExistingPlan[]
        setCurrentMostPopularPlan(plans.find((plan) => plan.isMostPopular) ?? null)
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  function set(field: keyof PlanForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSave() {
    if (!form.id.trim()) {
      setError('معرف الخطة مطلوب (مثال: free, basic, pro)')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(form.id.trim())) {
      setError('معرف الخطة يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام فقط')
      return
    }
    if (!form.name.trim()) {
      setError('اسم الخطة مطلوب')
      return
    }
    if (form.priceMonthly === '' || isNaN(parseFloat(form.priceMonthly))) {
      setError('السعر الشهري غير صالح')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const body = {
        id: form.id.trim(),
        name: form.name.trim(),
        nameEn: form.nameEn.trim() || null,
        priceMonthly: parseFloat(form.priceMonthly) || 0,
        priceYearly: form.priceYearly !== '' ? parseFloat(form.priceYearly) : null,
        orderFee: form.orderFee !== '' ? parseFloat(form.orderFee) : null,
        maxProducts: form.maxProducts !== '' ? parseInt(form.maxProducts, 10) : null,
        maxOrdersPerMonth: form.maxOrdersPerMonth !== '' ? parseInt(form.maxOrdersPerMonth, 10) : null,
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
        isMostPopular: form.isMostPopular,
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      }

      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'فشل الإنشاء')
      router.push('/super-admin/plans')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإنشاء')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Link
          href="/super-admin/plans"
          className="rounded-lg border p-1.5 hover:bg-gray-100"
          aria-label="رجوع"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">إضافة خطة جديدة</h1>
      </div>

      <div className="max-w-lg rounded-2xl border bg-white">
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">
              معرف الخطة * <span className="text-xs text-gray-400">(مثال: free, basic, pro)</span>
            </label>
            <input
              value={form.id}
              onChange={(e) => set('id', e.target.value)}
              aria-label="معرف الخطة"
              placeholder="free"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
              dir="ltr"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">اسم الخطة *</label>
              <input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                aria-label="اسم الخطة"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الاسم بالإنجليزية</label>
              <input
                value={form.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                aria-label="الاسم بالإنجليزية"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">السعر الشهري (ج.م)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.priceMonthly}
                onChange={(e) => set('priceMonthly', e.target.value)}
                aria-label="السعر الشهري"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">السعر السنوي (ج.م)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.priceYearly}
                onChange={(e) => set('priceYearly', e.target.value)}
                aria-label="السعر السنوي"
                placeholder="اختياري"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">رسوم الطلب (ج.م)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.orderFee}
                onChange={(e) => set('orderFee', e.target.value)}
                aria-label="رسوم الطلب"
                placeholder="0 = بدون رسوم"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الترتيب</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                aria-label="الترتيب"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">الحد الأقصى للمنتجات</label>
              <input
                type="number"
                min={0}
                value={form.maxProducts}
                onChange={(e) => set('maxProducts', e.target.value)}
                aria-label="الحد الأقصى للمنتجات"
                placeholder="فارغ = غير محدود"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الحد الأقصى للطلبات/شهر</label>
              <input
                type="number"
                min={0}
                value={form.maxOrdersPerMonth}
                onChange={(e) => set('maxOrdersPerMonth', e.target.value)}
                aria-label="الحد الأقصى للطلبات شهرياً"
                placeholder="فارغ = غير محدود"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">المميزات (سطر لكل ميزة)</label>
            <textarea
              rows={4}
              value={form.features}
              onChange={(e) => set('features', e.target.value)}
              aria-label="المميزات"
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isMostPopular}
              onChange={(e) => set('isMostPopular', e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">هذه هي الخطة الأكثر طلبًا</span>
          </label>

          <MostPopularPlanNotice
            currentMostPopularPlan={currentMostPopularPlan}
            targetPlanName={form.name}
            nextIsMostPopular={form.isMostPopular}
          />

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span className="text-sm">الخطة نشطة</span>
          </label>
        </div>

        {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <Link href="/super-admin/plans" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            إلغاء
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-black px-5 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            إنشاء الخطة
          </button>
        </div>
      </div>
    </div>
  )
}
