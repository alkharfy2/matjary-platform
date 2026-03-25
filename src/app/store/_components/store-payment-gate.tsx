'use client'

import { useState } from 'react'
import { AlertCircle, LockKeyhole } from 'lucide-react'
import { Button, Card } from '@/components/ui'

type StorePaymentGateProps = {
  storeId: string
  storeName: string
  storeSlug: string
  planName: string
  planPrice: string
}

export function StorePaymentGate({
  storeId,
  storeName,
  planName,
  planPrice,
}: StorePaymentGateProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/payments/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      })

      const json = await response.json()

      if (!response.ok || !json.success) {
        setError(json.error ?? 'حدث خطأ أثناء إنشاء جلسة الدفع')
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
      setError('فشل الاتصال بالخادم. حاول مرة أخرى.')
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell-gradient flex min-h-screen items-center justify-center px-4" dir="rtl">
      <Card variant="hero" className="mx-auto w-full max-w-lg text-center">
        <div className="mx-auto mb-6 inline-flex rounded-full bg-[var(--ds-primary-soft)] p-4 text-[var(--ds-primary)] shadow-[var(--ds-shadow-sm)]">
          <LockKeyhole className="h-8 w-8" />
        </div>

        <h1 className="ds-heading text-3xl font-black text-[var(--ds-text)]">
          متجرك جاهز لكنه بانتظار التفعيل
        </h1>
        <p className="mt-3 text-sm text-[var(--ds-text-soft)]">{storeName}</p>

        <div className="mt-6 rounded-[24px] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] p-6">
          <p className="text-sm text-[var(--ds-text-muted)]">
            أنت اخترت خطة <span className="font-bold text-[var(--ds-primary)]">{planName}</span>
          </p>
          <p className="mt-3 text-3xl font-black text-[var(--ds-text)]">
            {planPrice}{' '}
            <span className="text-base font-normal text-[var(--ds-text-soft)]">ج.م / شهر</span>
          </p>
        </div>

        {error ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-[18px] border border-[color:color-mix(in_oklab,var(--ds-danger)_34%,var(--ds-divider))] bg-[color:color-mix(in_oklab,var(--ds-danger)_12%,var(--ds-surface-elevated))] px-4 py-3 text-sm text-[color:color-mix(in_oklab,var(--ds-danger)_74%,var(--ds-text))]">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <Button onClick={handlePayment} loading={isLoading} glow className="w-full justify-center rounded-xl py-6 text-base sm:text-lg">
            {isLoading ? 'جارٍ التحويل للدفع...' : 'ادفع الآن وفعّل متجرك'}
          </Button>
        </div>

        <p className="mt-4 text-sm text-[var(--ds-text-soft)]">
          يمكنك إضافة منتجات وتجهيز متجرك من لوحة التحكم قبل الدفع.
        </p>
      </Card>
    </div>
  )
}
