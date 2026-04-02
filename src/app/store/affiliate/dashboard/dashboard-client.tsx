'use client'

import { useState } from 'react'

type AffiliateSale = {
  id: string
  saleAmount: string
  commissionAmount: string
  status: string
  createdAt: string
  orderNumber: string | null
}

type AffiliateData = {
  code: string
  name: string
  totalSales: string
  totalCommission: string
  pendingCommission: string
  sales: AffiliateSale[]
}

export function AffiliateDashboardClient({ storeSlug }: { storeSlug: string }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AffiliateData | null>(null)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/storefront/affiliate/dashboard?code=${encodeURIComponent(code.trim())}`)
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'لم يتم العثور على المسوق')
        return
      }
      setData(result.data)
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const statusLabels: Record<string, string> = {
    pending: 'معلقة',
    approved: 'معتمدة',
    paid: 'مدفوعة',
    cancelled: 'ملغاة',
  }

  if (!data) {
    return (
      <form onSubmit={handleLookup} className="card-surface rounded-lg border p-6" style={{ borderColor: 'var(--ds-border)' }}>
        <p className="mb-4 text-sm" style={{ color: 'var(--ds-text-muted)' }}>
          أدخل كود الإحالة الخاص بك لعرض إحصائياتك
        </p>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="كود الإحالة"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--ds-primary)' }}
          >
            {loading ? '...' : 'عرض'}
          </button>
        </div>
      </form>
    )
  }

  const referralLink = `https://${storeSlug}.matjary.com/?ref=${data.code}`

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
        <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>مرحباً</p>
        <p className="text-lg font-bold">{data.name}</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-gray-800">{referralLink}</code>
          <button
            onClick={() => navigator.clipboard.writeText(referralLink)}
            className="rounded border px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            نسخ
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>إجمالي المبيعات</p>
          <p className="mt-1 text-xl font-bold">{Number(data.totalSales).toFixed(2)} EGP</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>إجمالي الأرباح</p>
          <p className="mt-1 text-xl font-bold">{Number(data.totalCommission).toFixed(2)} EGP</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>أرباح معلقة</p>
          <p className="mt-1 text-xl font-bold">{Number(data.pendingCommission).toFixed(2)} EGP</p>
        </div>
      </div>

      {/* Sales */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">مبيعاتك الأخيرة</h2>
        <div className="card-surface overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ds-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <th className="px-4 py-3 text-right font-medium">الطلب</th>
                <th className="px-4 py-3 text-right font-medium">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium">العمولة</th>
                <th className="px-4 py-3 text-right font-medium">الحالة</th>
                <th className="px-4 py-3 text-right font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--ds-text-muted)' }}>
                    لا توجد مبيعات بعد
                  </td>
                </tr>
              )}
              {data.sales.map((sale) => (
                <tr key={sale.id} className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                  <td className="px-4 py-3">#{sale.orderNumber || sale.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{Number(sale.saleAmount).toFixed(2)} EGP</td>
                  <td className="px-4 py-3">{Number(sale.commissionAmount).toFixed(2)} EGP</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-800">
                      {statusLabels[sale.status] || sale.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--ds-text-muted)' }}>
                    {new Date(sale.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
