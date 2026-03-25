'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type Merchant = {
  id: string
  email: string
  displayName: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  storeName: string | null
  storeSlug: string | null
  storePlan: string | null
}

const planLabels: Record<string, string> = {
  free: 'مجاني',
  basic: 'أساسي',
  pro: 'احترافي',
}

const planColors: Record<string, string> = {
  free: 'bg-[var(--ds-surface-muted)] text-[var(--ds-text)]',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-[var(--ds-surface-muted)] text-[var(--ds-primary)]',
}

export default function SuperAdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchMerchants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
      })
      const res = await fetch(`/api/admin/merchants?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setMerchants(json.data?.merchants ?? [])
      setTotal(json.data?.total ?? 0)
      setTotalPages(json.data?.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchMerchants()
  }, [fetchMerchants])
  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">إدارة التجار</h1>
        <span className="text-sm text-[var(--ds-text-muted)]">{total} تاجر</span>
      </div>

      <div className="mb-6 card-surface p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالبريد الإلكتروني..."
          className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-primary)]/35"
        />
      </div>

      <div className="card-surface">
        {loading ? (
          <div className="py-12 text-center text-[var(--ds-text-muted)]/80">جارٍ التحميل...</div>
        ) : merchants.length === 0 ? (
          <div className="py-12 text-center text-[var(--ds-text-muted)]/80">لا يوجد تجار</div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {merchants.map((merchant) => (
                <div key={merchant.id} className="rounded-xl border border-[var(--ds-border)] p-4">
                  <p className="text-sm font-semibold">{merchant.displayName ?? '—'}</p>
                  <p className="mt-1 text-xs text-[var(--ds-text-muted)]" dir="ltr">{merchant.email}</p>
                  {merchant.phone ? <p className="text-xs text-[var(--ds-text-muted)]/80">{merchant.phone}</p> : null}
                  {merchant.storeName ? (
                    <div className="mt-2 rounded-lg bg-[var(--ds-surface-muted)] p-2">
                      <p className="text-sm font-medium">{merchant.storeName}</p>
                      <p className="text-xs text-[var(--ds-text-muted)]/80">{merchant.storeSlug}</p>
                      {merchant.storePlan ? (
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${planColors[merchant.storePlan] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'}`}>
                          {planLabels[merchant.storePlan] ?? merchant.storePlan}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--ds-text-muted)]/80">لا يوجد متجر</p>
                  )}
                  <p className="mt-2 text-xs text-[var(--ds-text-muted)]">{formatDate(merchant.createdAt)}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="hidden w-full min-w-[860px] md:table">
                <thead className="bg-[var(--ds-surface-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">التاجر</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">المتجر</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الخطة</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {merchants.map((merchant) => (
                    <tr key={merchant.id} className="hover:bg-[var(--ds-surface-muted)]">
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium">{merchant.displayName ?? '—'}</p>
                        {merchant.phone && <p className="text-xs text-[var(--ds-text-muted)]/80">{merchant.phone}</p>}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ds-text-muted)]" dir="ltr">{merchant.email}</td>
                      <td className="px-4 py-4">
                        {merchant.storeName ? (
                          <>
                            <p className="text-sm font-medium">{merchant.storeName}</p>
                            <p className="text-xs text-[var(--ds-text-muted)]/80">{merchant.storeSlug}</p>
                          </>
                        ) : (
                          <span className="text-sm text-[var(--ds-text-muted)]/80">لا يوجد متجر</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {merchant.storePlan ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[merchant.storePlan] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'}`}>
                            {planLabels[merchant.storePlan] ?? merchant.storePlan}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--ds-text-muted)]/80">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ds-text-muted)]">{formatDate(merchant.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-4">
            <p className="text-sm text-[var(--ds-text-muted)]">الصفحة {page} من {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1 text-sm hover:bg-[var(--ds-surface-muted)] disabled:opacity-40"
              >
                السابق
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border px-3 py-1 text-sm hover:bg-[var(--ds-surface-muted)] disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


