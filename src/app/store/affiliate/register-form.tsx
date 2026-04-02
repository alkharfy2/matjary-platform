'use client'

import { useState } from 'react'

export function AffiliateRegisterFormClient({ storeSlug }: { storeSlug: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string; link: string; message?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/storefront/affiliate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          phone: form.get('phone'),
          email: form.get('email') || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'حدث خطأ')
        return
      }

      setResult(data.data)
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-4 text-center">
        {result.message && (
          <p className="text-sm font-medium" style={{ color: 'var(--ds-primary)' }}>{result.message}</p>
        )}
        <div>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>كود الإحالة الخاص بك</p>
          <p className="mt-1 text-2xl font-bold font-mono">{result.code}</p>
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>رابط الإحالة</p>
          <div className="mt-1 flex items-center gap-2 justify-center">
            <code className="rounded bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">
              {result.link}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`https://${result.link}`)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
              style={{ borderColor: 'var(--ds-border)' }}
            >
              نسخ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">الاسم *</label>
        <input
          type="text"
          name="name"
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--ds-border)' }}
          placeholder="اسمك الكامل"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">رقم الهاتف *</label>
        <input
          type="tel"
          name="phone"
          required
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--ds-border)' }}
          placeholder="01xxxxxxxxx"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">الإيميل (اختياري)</label>
        <input
          type="email"
          name="email"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--ds-border)' }}
          placeholder="email@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: 'var(--ds-primary)' }}
      >
        {loading ? 'جاري التسجيل...' : 'سجل كمسوق'}
      </button>
    </form>
  )
}
