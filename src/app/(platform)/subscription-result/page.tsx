'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { buildTenantStorefrontHref, buildTenantDashboardHref } from '@/lib/tenant/urls'
import { Button, Card } from '@/components/ui'

type PaymentState = 'polling' | 'success' | 'failed' | 'error'

export default function SubscriptionResultPage() {
  const searchParams = useSearchParams()
  const storeId = searchParams.get('storeId')
  const statusParam = searchParams.get('status')
  const paymentStatus = searchParams.get('paymentStatus')

  const [state, setState] = useState<PaymentState>(
    statusParam === 'failure' || paymentStatus?.toUpperCase() === 'FAILED' ? 'failed' : 'polling'
  )
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [checkedOnce, setCheckedOnce] = useState(false)

  const maxPolls = 5

  const buildStatusUrl = useCallback(() => {
    const params = new URLSearchParams({ storeId: storeId! })

    const kashierParams = [
      'paymentStatus',
      'signature',
      'merchantOrderId',
      'orderId',
      'amount',
      'currency',
      'transactionId',
    ]

    for (const key of kashierParams) {
      const val = searchParams.get(key)
      if (val) params.set(key, val)
    }

    return `/api/payments/subscription/status?${params.toString()}`
  }, [storeId, searchParams])

  const checkStatus = useCallback(async () => {
    if (!storeId) {
      setState('error')
      return
    }

    try {
      const res = await fetch(buildStatusUrl())
      if (!res.ok) {
        setState('error')
        return
      }

      const json = await res.json()
      if (json.success && json.data.isPaid) {
        setState('success')
        setStoreSlug(json.data.slug)
      }
    } catch {
      // Keep polling
    }
  }, [storeId, buildStatusUrl])

  useEffect(() => {
    if (state === 'polling' && !checkedOnce) {
      setCheckedOnce(true)
      void checkStatus()
    }
  }, [state, checkedOnce, checkStatus])

  useEffect(() => {
    if (state !== 'polling' || !checkedOnce) return
    if (pollCount >= maxPolls) {
      setState('failed')
      return
    }

    const timer = setTimeout(() => {
      void checkStatus()
      setPollCount((prev) => prev + 1)
    }, 2000)

    return () => clearTimeout(timer)
  }, [state, pollCount, checkStatus, maxPolls, checkedOnce])

  if (!storeId) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <h1 className="ds-heading text-2xl font-bold text-[var(--ds-text)]">رابط غير صالح</h1>
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">تعذر قراءة معرف المتجر من الرابط.</p>
          <div className="mt-5">
            <Link href="/"><Button>العودة للرئيسية</Button></Link>
          </div>
        </Card>
      </div>
    )
  }

  if (state === 'polling') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <h1 className="ds-heading text-2xl font-bold text-[var(--ds-text)]">جارٍ التحقق من الدفع</h1>
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">نراجع حالة العملية الآن، يرجى الانتظار لحظات.</p>
          <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-[var(--ds-primary)] border-t-transparent" />
        </Card>
      </div>
    )
  }

  if (state === 'success') {
    const storefrontHref = storeSlug ? buildTenantStorefrontHref(storeSlug) : '/'
    const dashboardHref = storeSlug ? buildTenantDashboardHref(storeSlug) : '/dashboard'

    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="max-w-md text-center">
          <h1 className="ds-heading text-2xl font-bold text-[var(--ds-text)]">تم تفعيل المتجر بنجاح</h1>
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">يمكنك الآن استقبال الزوار وإدارة المبيعات مباشرة.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <a href={storefrontHref}><Button>زيارة المتجر</Button></a>
            <a href={dashboardHref}><Button variant="secondary">لوحة التحكم</Button></a>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="max-w-md text-center">
        <h1 className="ds-heading text-2xl font-bold text-[var(--ds-text)]">فشل الدفع</h1>
        <p className="mt-2 text-sm text-[var(--ds-text-muted)]">لم تكتمل عملية التفعيل. يمكنك إعادة المحاولة الآن.</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => { setState('polling'); setPollCount(0) }}>إعادة المحاولة</Button>
          <Link href="/"><Button variant="secondary">العودة للرئيسية</Button></Link>
        </div>
      </Card>
    </div>
  )
}
