'use client'

import { useState } from 'react'

type SubscriptionBannerProps = {
  storeId: string
}

export function SubscriptionBanner({ storeId }: SubscriptionBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleActivate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/payments/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.error ?? 'حدث خطأ')
        setIsLoading(false)
        return
      }

      if (json.data.activated) {
        window.location.reload()
        return
      }

      if (json.data.paymentUrl) {
        window.location.href = json.data.paymentUrl
      }
    } catch {
      setError('فشل الاتصال بالخادم')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-2 text-sm text-amber-800">
        <span>⚠️</span>
        <div>
          <p>متجرك غير مفعّل بعد — الزوار لن يستطيعوا رؤية موقعك.</p>
          {error && <p className="mt-1 text-red-600">{error}</p>}
        </div>
      </div>
      <button
        onClick={handleActivate}
        disabled={isLoading}
        className="shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'جارٍ...' : 'فعّل متجرك الآن'}
      </button>
    </div>
  )
}
