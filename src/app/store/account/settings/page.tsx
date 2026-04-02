'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'

type CustomerInfo = {
  id: string
  name: string
  phone: string
  email: string | null
}

export default function SettingsPage() {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/storefront/auth/me')
        const data = await res.json()
        if (!cancelled && data?.success) {
          setCustomer(data.data?.customer)
          setName(data.data?.customer?.name ?? '')
          setEmail(data.data?.customer?.email ?? '')
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
    setSuccess(false)

    if (name.trim().length < 2) {
      setError('الاسم يجب أن يكون حرفين على الأقل')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/storefront/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (data?.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
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
      <div className="surface-panel-elevated rounded-[28px] p-6">
        <h1 className="ds-heading text-2xl font-black text-[var(--ds-text)]">الإعدادات</h1>
        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">تعديل بياناتك الشخصية</p>
      </div>

      <div className="surface-panel-elevated rounded-[24px] p-6">
        <div className="space-y-5 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--ds-text)]">رقم الهاتف</label>
            <input
              dir="ltr"
              value={customer?.phone ?? ''}
              disabled
              className="w-full rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-4 py-3 text-sm text-[var(--ds-text-soft)] cursor-not-allowed"
            />
            <p className="text-xs text-[var(--ds-text-soft)]">لا يمكن تغيير رقم الهاتف</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--ds-text)]">الاسم</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-3 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35 hover:border-[var(--ds-border-strong)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--ds-text)]">البريد الإلكتروني (اختياري)</label>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-3 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35 hover:border-[var(--ds-border-strong)]"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--ds-danger)]">{error}</p>
          )}

          {success && (
            <p className="text-sm text-[var(--ds-success)]">تم حفظ التغييرات بنجاح ✓</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-[20px] px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  )
}
