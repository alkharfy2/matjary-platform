'use client'

import Link from 'next/link'
import { ArrowRight, Loader2, Wallet, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

type WalletTransaction = {
  id: string
  type: 'top_up' | 'order_fee'
  amount: string
  balanceAfter: string
  reference: string | null
  notes: string | null
  createdAt: string
}

type WalletData = {
  storeId: string
  balance: string
  orderFee: string | null
  hasOrderFee: boolean
  transactions: WalletTransaction[]
}

function formatMoney(value: string | number) {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (!isFinite(n)) return '0.00 ج.م'
  return `${n.toFixed(2)} ج.م`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // حقل المبلغ
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [topUpError, setTopUpError] = useState<string | null>(null)

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/dashboard/wallet')
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'تعذر تحميل المحفظة')
      setData(json.data as WalletData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المحفظة')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchWallet()
  }, [fetchWallet])

  async function handleTopUp() {
    if (!data) return
    setTopUpError(null)

    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed < 5) {
      setTopUpError('أدخل مبلغاً بحد أدنى 5 ج.م')
      return
    }
    if (parsed > 10000) {
      setTopUpError('الحد الأقصى للشحن 10,000 ج.م')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/payments/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: data.storeId, amount: parsed }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? 'تعذر بدء عملية الدفع')

      // توجيه للبوابة
      window.location.href = json.data.paymentUrl as string
    } catch (err) {
      setTopUpError(err instanceof Error ? err.message : 'تعذر بدء عملية الدفع')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error ?? 'تعذر تحميل المحفظة'}</p>
        <button
          onClick={fetchWallet}
          className="mt-4 text-sm text-blue-600 underline"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  const balance = parseFloat(data.balance)
  const orderFee = data.orderFee ? parseFloat(data.orderFee) : null
  const isLow = orderFee !== null && balance < orderFee

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="rounded-lg p-2 transition hover:bg-gray-100">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">المحفظة</h1>
          <p className="text-sm text-gray-500">إدارة رصيدك ورسوم الطلبات</p>
        </div>
      </div>

      {/* بطاقة الرصيد */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6">
          <div className="mb-3 flex items-center gap-2 text-gray-500">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium">الرصيد الحالي</span>
          </div>
          <p className="text-3xl font-bold">{formatMoney(data.balance)}</p>
          {isLow && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>رصيدك أقل من رسوم الطلب ({formatMoney(data.orderFee!)})</span>
            </div>
          )}
        </div>

        {data.hasOrderFee && (
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <span className="text-base">💸</span>
              <span className="text-sm font-medium">رسوم الطلب الواحد</span>
            </div>
            <p className="text-3xl font-bold">{formatMoney(data.orderFee!)}</p>
            <p className="mt-2 text-xs text-gray-400">
              يُخصم مرة واحدة عند فتح تفاصيل الطلب لأول مرة
            </p>
          </div>
        )}

        {/* التوقعات */}
        {data.hasOrderFee && orderFee && orderFee > 0 && (
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-3 flex items-center gap-2 text-gray-500">
              <span className="text-base">📦</span>
              <span className="text-sm font-medium">طلبات متاحة</span>
            </div>
            <p className="text-3xl font-bold">{Math.floor(balance / orderFee)}</p>
            <p className="mt-2 text-xs text-gray-400">
              بناءً على رصيدك الحالي
            </p>
          </div>
        )}
      </div>

      {/* شحن الرصيد */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">شحن الرصيد</h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-gray-600">المبلغ (ج.م)</label>
            <input
              type="number"
              min={5}
              max={10000}
              step={1}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setTopUpError(null)
              }}
              placeholder="أدخل المبلغ (5 - 10,000)"
              className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-black focus:ring-2 focus:ring-black/10"
              dir="ltr"
            />
          </div>

          <div className="flex gap-2">
            {[50, 100, 200, 500].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(String(preset))
                  setTopUpError(null)
                }}
                className="rounded-lg border px-3 py-2 text-sm transition hover:bg-gray-50"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {topUpError && (
          <p className="mt-2 text-sm text-red-600">{topUpError}</p>
        )}

        <button
          onClick={handleTopUp}
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-white transition hover:bg-gray-800 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          شحن الرصيد
        </button>
      </div>

      {/* سجل المعاملات */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">سجل المعاملات</h2>
        </div>

        {data.transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400">لا توجد معاملات بعد</div>
        ) : (
          <div className="divide-y">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    tx.type === 'top_up' ? 'bg-green-100' : 'bg-red-50'
                  }`}
                >
                  {tx.type === 'top_up' ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {tx.type === 'top_up' ? 'شحن رصيد' : (tx.notes ?? 'رسوم طلب')}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
                  {tx.reference ? (
                    <p className="text-xs text-gray-400 mt-0.5" dir="ltr">
                      ref: {tx.reference}
                    </p>
                  ) : null}
                </div>

                <div className="text-end shrink-0">
                  <p
                    className={`font-semibold ${
                      tx.type === 'top_up' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {tx.type === 'top_up' ? '+' : ''}{formatMoney(tx.amount)}
                  </p>
                  <p className="text-xs text-gray-400">رصيد: {formatMoney(tx.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
