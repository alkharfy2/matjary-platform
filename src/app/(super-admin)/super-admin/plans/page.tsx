'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Pencil, X, Check, Plus, Trash2 } from 'lucide-react'
import { MostPopularPlanNotice } from './_components/most-popular-plan-notice'

type Plan = {
  id: string
  name: string
  nameEn: string | null
  priceMonthly: string
  priceYearly: string | null
  orderFee: string | null
  maxProducts: number | null
  maxOrdersPerMonth: number | null
  features: string[]
  isMostPopular: boolean
  isActive: boolean
  sortOrder: number
}

type PlanForm = {
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

function emptyForm(plan?: Plan): PlanForm {
  return {
    name: plan?.name ?? '',
    nameEn: plan?.nameEn ?? '',
    priceMonthly: plan?.priceMonthly ?? '0',
    priceYearly: plan?.priceYearly ?? '',
    orderFee: plan?.orderFee ?? '',
    maxProducts: plan?.maxProducts != null ? String(plan.maxProducts) : '',
    maxOrdersPerMonth: plan?.maxOrdersPerMonth != null ? String(plan.maxOrdersPerMonth) : '',
    features: plan?.features?.join('\n') ?? '',
    isMostPopular: plan?.isMostPopular ?? false,
    isActive: plan?.isActive ?? true,
    sortOrder: String(plan?.sortOrder ?? 0),
  }
}

function EditDialog({
  plan,
  currentMostPopularPlan,
  onClose,
  onSaved,
}: {
  plan: Plan
  currentMostPopularPlan: Plan | null
  onClose: () => void
  onSaved: (updated: Plan) => void
}) {
  const [form, setForm] = useState<PlanForm>(emptyForm(plan))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof PlanForm, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSave() {
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
        name: form.name,
        nameEn: form.nameEn || null,
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
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'فشل الحفظ')
      onSaved(json.data as Plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">تعديل خطة: {plan.name}</h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">اسم الخطة *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                aria-label="اسم الخطة"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الاسم بالإنجليزية</label>
              <input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)}
                aria-label="الاسم بالإنجليزية"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">السعر الشهري (ج.م)</label>
              <input type="number" min={0} step={0.01} value={form.priceMonthly}
                onChange={(e) => set('priceMonthly', e.target.value)}
                aria-label="السعر الشهري"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">السعر السنوي (ج.م)</label>
              <input type="number" min={0} step={0.01} value={form.priceYearly}
                onChange={(e) => set('priceYearly', e.target.value)}
                aria-label="السعر السنوي"
                placeholder="اختياري"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">رسوم الطلب (ج.م)</label>
              <input type="number" min={0} step={0.01} value={form.orderFee}
                onChange={(e) => set('orderFee', e.target.value)}
                aria-label="رسوم الطلب"
                placeholder="0 = بدون رسوم"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الترتيب</label>
              <input type="number" min={0} value={form.sortOrder}
                onChange={(e) => set('sortOrder', e.target.value)}
                aria-label="الترتيب"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">الحد الأقصى للمنتجات</label>
              <input type="number" min={0} value={form.maxProducts}
                onChange={(e) => set('maxProducts', e.target.value)}
                aria-label="الحد الأقصى للمنتجات"
                placeholder="فارغ = غير محدود"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">الحد الأقصى للطلبات/شهر</label>
              <input type="number" min={0} value={form.maxOrdersPerMonth}
                onChange={(e) => set('maxOrdersPerMonth', e.target.value)}
                aria-label="الحد الأقصى للطلبات شهرياً"
                placeholder="فارغ = غير محدود"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">المميزات (سطر لكل ميزة)</label>
            <textarea rows={4} value={form.features}
              onChange={(e) => set('features', e.target.value)}
              aria-label="المميزات"
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-black" />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.isMostPopular}
              onChange={(e) => set('isMostPopular', e.target.checked)}
              className="h-4 w-4 rounded" />
            <span className="text-sm">هذه هي الخطة الأكثر طلبًا</span>
          </label>

          <MostPopularPlanNotice
            currentMostPopularPlan={currentMostPopularPlan}
            targetPlanId={plan.id}
            targetPlanName={form.name || plan.name}
            nextIsMostPopular={form.isMostPopular}
          />

          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded" />
            <span className="text-sm">الخطة نشطة</span>
          </label>
        </div>

        {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
            إلغاء
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-black px-5 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/plans')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setPlans(json.data as Plan[])
        } else {
          setError(json.error ?? 'تعذر تحميل الخطط')
        }
      })
      .catch(() => setError('تعذر تحميل الخطط'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('هل أنت متأكد من حذف هذه الخطة')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'فشل الحذف')
      setPlans((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الحذف')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) return <p className="text-red-600">{error}</p>

  const currentMostPopularPlan = plans.find((plan) => plan.isMostPopular) ?? null

  return (
    <div className="space-y-8" dir="rtl">
      {editingPlan && (
        <EditDialog
          plan={editingPlan}
          currentMostPopularPlan={currentMostPopularPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={(updated) => {
            setPlans((prev) =>
              prev.map((p) => {
                if (p.id === updated.id) return updated
                if (updated.isMostPopular) return { ...p, isMostPopular: false }
                return p
              })
            )
            setEditingPlan(null)
          }}
        />
      )}

      <h1 className="text-2xl font-bold">إدارة الخطط</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border bg-white p-6">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="flex items-center gap-2">
                {plan.isMostPopular ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    الأكثر طلبًا
                  </span>
                ) : null}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {plan.isActive ? 'نشطة' : 'معطلة'}
                </span>
              </div>
            </div>
            <p className="mb-4 text-2xl font-bold text-indigo-600">
              {parseFloat(plan.priceMonthly) === 0 ? 'مجاني' : `${parseFloat(plan.priceMonthly).toFixed(0)} ج.م/شهر`}
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="text-gray-400">المنتجات: </span>
                {plan.maxProducts === null ? 'غير محدود' : plan.maxProducts}
              </p>
              <p>
                <span className="text-gray-400">رسوم الطلب: </span>
                <span className="font-semibold">
                  {plan.orderFee && parseFloat(plan.orderFee) > 0
                    ? `${parseFloat(plan.orderFee).toFixed(2)} ج.م`
                    : 'بدون رسوم'}
                </span>
              </p>
              {plan.features?.length > 0 && (
                <p className="text-gray-400">{plan.features.length} ميزة</p>
              )}
            </div>

            <div className="mt-4 flex gap-2 border-t pt-4">
              <button
                onClick={() => setEditingPlan(plan)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                تعديل
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                disabled={deletingId === plan.id}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}

        <Link href="/super-admin/plans/new"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white p-6 text-gray-400 transition hover:border-gray-400 hover:text-gray-600">
          <Plus className="h-8 w-8" />
          <span className="text-sm">إضافة خطة جديدة</span>
        </Link>
      </div>
    </div>
  )
}
