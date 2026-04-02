'use client'

import { useEffect, useState } from 'react'
import { MapPin, Plus, Star, Loader2 } from 'lucide-react'

type SavedAddress = {
  id: string
  label: string
  customerName: string
  customerPhone: string
  governorate: string
  city: string
  area: string
  street: string
  building: string
  isDefault: boolean
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    label: '',
    customerName: '',
    customerPhone: '',
    governorate: '',
    city: '',
    area: '',
    street: '',
    building: '',
    isDefault: false,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/storefront/auth/addresses')
        const data = await res.json()
        if (!cancelled && data?.success) {
          setAddresses(data.data?.addresses ?? [])
        }
      } catch { /* handled by layout */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  async function handleSave() {
    setError('')
    if (!form.label.trim() || !form.customerName.trim() || !form.governorate.trim()) {
      setError('يرجى ملء الحقول المطلوبة (العنوان، الاسم، المحافظة)')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/storefront/auth/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (data?.success) {
        setAddresses(data.data?.addresses ?? [])
        setShowForm(false)
        setForm({
          label: '', customerName: '', customerPhone: '',
          governorate: '', city: '', area: '', street: '', building: '', isDefault: false,
        })
      } else {
        setError(data?.error?.message ?? 'حدث خطأ أثناء الحفظ')
      }
    } catch {
      setError('تعذر الاتصال بالخادم')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary,#000)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-panel-elevated flex items-center justify-between rounded-[28px] p-6">
        <div>
          <h1 className="ds-heading text-2xl font-black text-[var(--ds-text)]">عناويني</h1>
          <p className="mt-1 text-sm text-[var(--ds-text-muted)]">إدارة عناوين التوصيل المحفوظة</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-[16px] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--button-glow)] transition-all hover:-translate-y-0.5"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          <Plus className="h-4 w-4" />
          إضافة عنوان
        </button>
      </div>

      {/* Add Address Form */}
      {showForm && (
        <div className="surface-panel-elevated rounded-[24px] p-6">
          <h2 className="mb-4 text-lg font-bold text-[var(--ds-text)]">عنوان جديد</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">تسمية العنوان *</label>
              <input
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
                placeholder="مثال: المنزل، العمل"
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">اسم المستلم *</label>
              <input
                value={form.customerName}
                onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">رقم الهاتف</label>
              <input
                dir="ltr"
                value={form.customerPhone}
                onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">المحافظة *</label>
              <input
                value={form.governorate}
                onChange={(e) => setForm((p) => ({ ...p, governorate: e.target.value }))}
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">المدينة</label>
              <input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">المنطقة</label>
              <input
                value={form.area}
                onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">الشارع</label>
              <input
                value={form.street}
                onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--ds-text-soft)]">المبنى/العمارة</label>
              <input
                value={form.building}
                onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
                className="w-full rounded-[14px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-2.5 text-sm text-[var(--ds-text)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35"
              />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-[var(--ds-text-muted)]">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
              className="rounded"
            />
            تعيين كعنوان افتراضي
          </label>

          {error && (
            <p className="mt-3 text-sm text-[var(--ds-danger)]">{error}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-[16px] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--button-glow)] disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ العنوان
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-[16px] px-5 py-2.5 text-sm font-medium text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)]"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Address Cards */}
      {addresses.length === 0 && !showForm ? (
        <div className="surface-panel-elevated flex flex-col items-center gap-4 rounded-[28px] p-10">
          <MapPin className="h-16 w-16 text-[var(--ds-text-soft)]" />
          <p className="text-[var(--ds-text-muted)]">لم تقم بإضافة أي عنوان بعد</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`surface-panel-elevated relative rounded-[24px] p-5 ${
                addr.isDefault ? 'ring-2 ring-[var(--color-primary,#000)]/30' : ''
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--ds-text-soft)]" />
                <span className="font-bold text-[var(--ds-text)]">{addr.label}</span>
                {addr.isDefault && (
                  <span className="flex items-center gap-1 rounded-full bg-[var(--color-primary,#000)]/10 px-2 py-0.5 text-xs font-semibold" style={{ color: 'var(--color-primary, #000)' }}>
                    <Star className="h-3 w-3" />
                    افتراضي
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm text-[var(--ds-text-muted)]">
                <p>{addr.customerName}</p>
                {addr.customerPhone && <p dir="ltr">{addr.customerPhone}</p>}
                <p>
                  {[addr.governorate, addr.city, addr.area, addr.street, addr.building]
                    .filter(Boolean)
                    .join('، ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
