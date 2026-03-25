'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatPrice } from '@/lib/utils'

type ShippingZone = {
  id: string
  name: string
  governorates: string[]
  shippingFee: string
  freeShippingMinimum: string | null
  isActive: boolean
  sortOrder: number
}

type ShippingZoneFormState = {
  name: string
  governorates: string[]
  shippingFee: string
  freeShippingMinimum: string
  isActive: boolean
}

const emptyFormState: ShippingZoneFormState = {
  name: '',
  governorates: [],
  shippingFee: '',
  freeShippingMinimum: '',
  isActive: true,
}

const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقهلية',
  'البحر الأحمر',
  'البحيرة',
  'الفيوم',
  'الغربية',
  'الإسماعيلية',
  'المنوفية',
  'المنيا',
  'القليوبية',
  'الوادي الجديد',
  'السويس',
  'أسوان',
  'أسيوط',
  'بني سويف',
  'بورسعيد',
  'دمياط',
  'الشرقية',
  'جنوب سيناء',
  'كفر الشيخ',
  'مطروح',
  'الأقصر',
  'قنا',
  'شمال سيناء',
  'سوهاج',
]

export default function ShippingZonesPage() {
  const [zones, setZones] = useState<ShippingZone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingZoneId, setUpdatingZoneId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [form, setForm] = useState<ShippingZoneFormState>(emptyFormState)

  const canSubmit = useMemo(() => {
    const shippingFeeValue = Number.parseFloat(form.shippingFee)
    return (
      form.name.trim().length > 0 &&
      form.governorates.length === 1 &&
      Number.isFinite(shippingFeeValue) &&
      shippingFeeValue >= 0
    )
  }, [form.name, form.shippingFee, form.governorates.length])

  useEffect(() => {
    void loadZones()
  }, [])

  async function loadZones() {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch('/api/dashboard/shipping')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحميل مناطق الشحن')
      }

      setZones(data.data as ShippingZone[])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل مناطق الشحن')
    } finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof ShippingZoneFormState>(
    key: K,
    value: ShippingZoneFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleToggleZoneStatus(zone: ShippingZone) {
    try {
      setUpdatingZoneId(zone.id)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/dashboard/shipping/${zone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !zone.isActive }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحديث حالة منطقة الشحن')
      }

      setZones((prev) =>
        prev.map((current) =>
          current.id === zone.id
            ? { ...current, isActive: !current.isActive }
            : current
        )
      )
      setSuccessMessage(zone.isActive ? 'تم تعطيل منطقة الشحن' : 'تم تفعيل منطقة الشحن')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة منطقة الشحن')
    } finally {
      setUpdatingZoneId(null)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const shippingFee = Number.parseFloat(form.shippingFee)
      const freeShippingMinimum = form.freeShippingMinimum.trim()
        ? Number.parseFloat(form.freeShippingMinimum)
        : null

      if (!Number.isFinite(shippingFee) || shippingFee < 0) {
        throw new Error('تكلفة الشحن غير صالحة')
      }

      if (
        freeShippingMinimum !== null &&
        (!Number.isFinite(freeShippingMinimum) || freeShippingMinimum < 0)
      ) {
        throw new Error('حد الشحن المجاني غير صالح')
      }

      const response = await fetch('/api/dashboard/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          governorates: form.governorates.slice(0, 1),
          shippingFee,
          freeShippingMinimum,
          estimatedDays: null,
          isActive: form.isActive,
          sortOrder: zones.length,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر إنشاء منطقة الشحن')
      }

      setForm(emptyFormState)
      setSuccessMessage('تم إنشاء منطقة الشحن بنجاح')
      await loadZones()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إنشاء منطقة الشحن')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">مناطق الشحن</h1>
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
        <h2 className="mb-4 text-lg font-semibold">إضافة منطقة شحن</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">اسم المنطقة</label>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">تكلفة الشحن</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.shippingFee}
              onChange={(event) => updateForm('shippingFee', event.target.value)}
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">المحافظات</label>
            <select
              value={form.governorates[0] ?? ''}
              onChange={(event) =>
                updateForm('governorates', event.target.value ? [event.target.value] : [])
              }
              className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
              required
            >
              <option value="">اختر محافظة</option>
              {EGYPT_GOVERNORATES.map((governorate) => (
                <option key={governorate} value={governorate}>
                  {governorate}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--ds-text-muted)]">
              اختر محافظة واحدة من القائمة المنسدلة
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">حد الشحن المجاني</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.freeShippingMinimum}
              onChange={(event) => updateForm('freeShippingMinimum', event.target.value)}
              placeholder="اختياري"
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
            {saving ? 'جاري الحفظ...' : 'حفظ منطقة الشحن'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden card-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
          <thead className="bg-[var(--ds-surface-muted)]">
            <tr>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">اسم المنطقة</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">المحافظات</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">تكلفة الشحن</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">حد الشحن المجاني</th>
              <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--ds-text-muted)]">
                  جاري تحميل مناطق الشحن...
                </td>
              </tr>
            ) : zones.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[var(--ds-text-muted)]">
                  لا توجد مناطق شحن بعد.
                </td>
              </tr>
            ) : (
              zones.map((zone) => (
                <tr key={zone.id} className="border-t border-[var(--ds-border)]/70">
                  <td className="px-4 py-3 font-medium">{zone.name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--ds-text)]">
                    {zone.governorates.join('، ')}
                  </td>
                  <td className="px-4 py-3">{formatPrice(Number(zone.shippingFee))}</td>
                  <td className="px-4 py-3">
                    {zone.freeShippingMinimum
                      ? formatPrice(Number(zone.freeShippingMinimum))
                      : 'لا يوجد'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          zone.isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]'
                        }`}
                      >
                        {zone.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleToggleZoneStatus(zone)}
                        disabled={updatingZoneId === zone.id}
                        className="rounded-md border border-[var(--ds-border)] px-2 py-1 text-xs text-[var(--ds-text)] hover:bg-[var(--ds-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingZoneId === zone.id ? '...' : zone.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}




