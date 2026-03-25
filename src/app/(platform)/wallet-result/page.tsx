'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { buildTenantDashboardHref } from '@/lib/tenant/urls'

type PaymentState = 'polling' | 'success' | 'failed' | 'error'

export default function WalletResultPage() {
  const searchParams = useSearchParams()
  const storeId = searchParams.get('storeId')
  const statusParam = searchParams.get('status')
  const paymentStatus = searchParams.get('paymentStatus')

  const [state, setState] = useState<PaymentState>(
    statusParam === 'failure' || paymentStatus?.toUpperCase() === 'FAILED' ? 'failed' : 'polling',
  )
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState<string | null>(null)
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
    return `/api/payments/wallet/status?${params.toString()}`
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
      if (json.success && json.data.balance !== undefined) {
        // نعتبر النجاح: المحفظة وُجدت + paymentStatus SUCCESS من Kashier
        const kashierStatus = searchParams.get('paymentStatus')?.toUpperCase()
        if (kashierStatus === 'SUCCESS') {
          setState('success')
          setStoreSlug(json.data.slug ?? null)
          setNewBalance(json.data.balance as string)
        } else if (kashierStatus === 'FAILED') {
          setState('failed')
        }
        // إذا لا يوجد paymentStatus بعد نكمل polling
      }
    } catch {
      // مشكلة مؤقتة - نكمل polling
    }
  }, [storeId, buildStatusUrl, searchParams])

  // أول check فوري
  useEffect(() => {
    if (state === 'polling' && !checkedOnce) {
      setCheckedOnce(true)
      checkStatus()
    }
  }, [state, checkedOnce, checkStatus])

  // باقي الـ polls بتأخير 2 ثانية
  useEffect(() => {
    if (state !== 'polling' || !checkedOnce) return
    if (pollCount >= maxPolls) {
      setState('failed')
      return
    }

    const timer = setTimeout(() => {
      checkStatus()
      setPollCount((prev) => prev + 1)
    }, 2000)

    return () => clearTimeout(timer)
  }, [state, pollCount, checkStatus, maxPolls, checkedOnce])

  if (!storeId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
        <div className="mx-auto max-w-md p-8 text-center">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">رابط غير صالح</h1>
          <p className="mb-6 text-gray-600">لم يتم العثور على معرف المتجر في الرابط</p>
          <Link
            href="/dashboard/wallet"
            className="inline-block rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800"
          >
            العودة للمحفظة
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'polling') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
        <div className="mx-auto max-w-md p-8 text-center">
          <div className="mb-4 animate-pulse text-5xl">⏳</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">جارٍ التحقق من الدفع...</h1>
          <p className="mb-4 text-gray-600">يُرجى الانتظار بينما نتحقق من حالة الدفع</p>
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        </div>
      </div>
    )
  }

  if (state === 'success') {
    const dashboardHref = storeSlug ? buildTenantDashboardHref(storeSlug) : '/dashboard/wallet'
    const walletHref = storeSlug ? `${buildTenantDashboardHref(storeSlug)}/wallet` : '/dashboard/wallet'

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-xs text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">تم شحن رصيدك بنجاح!</h1>
          {newBalance ? (
            <p className="mb-1 text-lg font-semibold text-black">
              الرصيد الجديد: {parseFloat(newBalance).toFixed(2)} ج.م
            </p>
          ) : null}
          <p className="mb-6 text-gray-600">
            يمكنك الآن عرض تفاصيل الطلبات بشكل كامل.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={walletHref}
              className="inline-block rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800"
            >
              المحفظة
            </a>
            <a
              href={dashboardHref}
              className="inline-block rounded-lg bg-gray-100 px-6 py-3 text-gray-700 transition hover:bg-gray-200"
            >
              لوحة التحكم
            </a>
          </div>
        </div>
      </div>
    )
  }

  // فشل أو خطأ
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-xs text-center">
        <div className="mb-4 text-6xl">❌</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">فشل الدفع</h1>
        <p className="mb-6 text-gray-600">
          لم يتم إكمال عملية الدفع.
          <br />
          يمكنك المحاولة مرة أخرى.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard/wallet"
            className="inline-block rounded-lg bg-black px-6 py-3 text-white transition hover:bg-gray-800"
          >
            حاول مرة أخرى
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-gray-100 px-6 py-3 text-gray-700 transition hover:bg-gray-200"
          >
            لوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  )
}
