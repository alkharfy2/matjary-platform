'use client'

import { useState } from 'react'

type Transaction = {
  id: string
  points: number
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted'
  notes: string | null
  createdAt: string
}

type BalanceData = {
  points: number
  valueInEgp: number
  canRedeem: boolean
  minRedemption: number
}

export function LoyaltyClient({
  pointValue,
  minRedemption,
}: {
  pointValue: number
  minRedemption: number
}) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim() || phone.trim().length < 10) return
    setLoading(true)
    setError(null)

    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetch(`/api/storefront/loyalty/balance?phone=${encodeURIComponent(phone.trim())}`),
        fetch(`/api/storefront/loyalty/history?phone=${encodeURIComponent(phone.trim())}`),
      ])

      const balanceData = await balanceRes.json()
      const historyData = await historyRes.json()

      if (!balanceRes.ok) {
        setError(balanceData.error || 'حدث خطأ')
        return
      }

      setBalance(balanceData.data)
      setTransactions(historyData.data?.transactions ?? [])
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const typeLabels: Record<string, string> = {
    earned: 'مكتسبة',
    redeemed: 'مستخدمة',
    expired: 'منتهية',
    adjusted: 'تعديل',
  }

  const typeColors: Record<string, string> = {
    earned: 'text-green-600 dark:text-green-400',
    redeemed: 'text-red-600 dark:text-red-400',
    expired: 'text-gray-500 dark:text-gray-400',
    adjusted: 'text-blue-600 dark:text-blue-400',
  }

  if (!balance) {
    return (
      <form onSubmit={handleLookup} className="card-surface rounded-lg border p-6" style={{ borderColor: 'var(--ds-border)' }}>
        <p className="mb-4 text-sm" style={{ color: 'var(--ds-text-muted)' }}>
          أدخل رقم هاتفك لعرض رصيد النقاط وسجل المعاملات
        </p>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="رقم الهاتف (مثال: 01012345678)"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            dir="ltr"
          />
          <button
            type="submit"
            disabled={loading || phone.trim().length < 10}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--ds-primary)' }}
          >
            {loading ? '...' : 'عرض'}
          </button>
        </div>
        {minRedemption > 0 && (
          <p className="mt-3 text-xs" style={{ color: 'var(--ds-text-muted)' }}>
            الحد الأدنى للاستخدام: {minRedemption} نقطة
          </p>
        )}
      </form>
    )
  }

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>رصيد النقاط</p>
          <p className="mt-1 text-2xl font-bold">{balance.points}</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>القيمة بالجنيه</p>
          <p className="mt-1 text-2xl font-bold">{balance.valueInEgp.toFixed(2)} EGP</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>الحالة</p>
          <p className={`mt-1 text-lg font-bold ${balance.canRedeem ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {balance.canRedeem ? 'يمكن الاستخدام' : `يلزم ${balance.minRedemption} نقطة`}
          </p>
        </div>
      </div>

      {pointValue > 0 && (
        <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>
          كل نقطة = {pointValue} جنيه
        </p>
      )}

      {/* Transactions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">سجل المعاملات</h2>
        <div className="card-surface overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ds-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <th className="px-4 py-3 text-right font-medium">النوع</th>
                <th className="px-4 py-3 text-right font-medium">النقاط</th>
                <th className="px-4 py-3 text-right font-medium">ملاحظات</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--ds-text-muted)' }}>
                    لا توجد معاملات بعد
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-800 ${typeColors[tx.type] || ''}`}>
                      {typeLabels[tx.type] || tx.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${tx.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>
                    {tx.notes || '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>
                    {new Date(tx.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lookup another phone */}
      <button
        onClick={() => { setBalance(null); setTransactions([]); setPhone('') }}
        className="text-sm underline"
        style={{ color: 'var(--ds-primary)' }}
      >
        البحث برقم آخر
      </button>
    </div>
  )
}
