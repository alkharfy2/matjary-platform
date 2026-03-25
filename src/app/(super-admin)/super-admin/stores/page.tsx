'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '@/lib/utils'

type Store = {
  id: string
  name: string
  slug: string
  plan: string
  isActive: boolean
  contactEmail: string | null
  createdAt: string
  merchantName: string | null
  merchantEmail: string
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

export default function SuperAdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
        ...(status && { status }),
        ...(plan && { plan }),
      })
      const res = await fetch(`/api/admin/stores?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setStores(json.data?.stores ?? [])
      setTotal(json.data?.total ?? 0)
      setTotalPages(json.data?.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [page, search, status, plan])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])
  useEffect(() => {
    setPage(1)
  }, [search, status, plan])

  async function toggleStore(id: string, current: boolean) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      })
      if (res.ok) {
        setStores((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !current } : s)))
      }
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">إدارة المتاجر</h1>
        <span className="text-sm text-[var(--ds-text-muted)]">{total} متجر</span>
      </div>

      <div className="mb-6 card-surface p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم..."
            className="min-w-0 flex-1 rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-primary)]/35"
            suppressHydrationWarning
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-primary)]/35 sm:w-auto"
            suppressHydrationWarning
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
          </select>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-primary)]/35 sm:w-auto"
            suppressHydrationWarning
          >
            <option value="">كل الخطط</option>
            <option value="free">مجاني</option>
            <option value="basic">أساسي</option>
            <option value="pro">احترافي</option>
          </select>
        </div>
      </div>

      <div className="card-surface">
        {loading ? (
          <div className="py-12 text-center text-[var(--ds-text-muted)]/80">جارٍ التحميل...</div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center text-[var(--ds-text-muted)]/80">لا توجد متاجر</div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {stores.map((store) => (
                <div key={store.id} className="rounded-xl border border-[var(--ds-border)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{store.name}</p>
                      <p className="truncate text-xs text-[var(--ds-text-muted)]/80">{store.slug}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[store.plan] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'}`}>
                      {planLabels[store.plan] ?? store.plan}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{store.merchantName ?? '—'}</p>
                  <p className="text-xs text-[var(--ds-text-muted)]/80" dir="ltr">{store.merchantEmail}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {store.isActive ? 'نشط' : 'موقوف'}
                    </span>
                    <button
                      onClick={() => toggleStore(store.id, store.isActive)}
                      disabled={togglingId === store.id}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                        store.isActive
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-green-300 text-green-600 hover:bg-green-50'
                      } disabled:opacity-50`}
                    >
                      {togglingId === store.id ? '...' : store.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--ds-text-muted)]">{formatDate(store.createdAt)}</p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="hidden w-full min-w-[860px] md:table">
                <thead className="bg-[var(--ds-surface-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">المتجر</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">التاجر</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الخطة</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">الحالة</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">تاريخ الإنشاء</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stores.map((store) => (
                    <tr key={store.id} className="hover:bg-[var(--ds-surface-muted)]">
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium">{store.name}</p>
                        <p className="text-xs text-[var(--ds-text-muted)]/80">{store.slug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm">{store.merchantName ?? '—'}</p>
                        <p className="text-xs text-[var(--ds-text-muted)]/80">{store.merchantEmail}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planColors[store.plan] ?? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'}`}>
                          {planLabels[store.plan] ?? store.plan}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {store.isActive ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ds-text-muted)]">{formatDate(store.createdAt)}</td>
                      <td className="px-4 py-4 text-end">
                        <button
                          onClick={() => toggleStore(store.id, store.isActive)}
                          disabled={togglingId === store.id}
                          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                            store.isActive
                              ? 'border-red-300 text-red-600 hover:bg-red-50'
                              : 'border-green-300 text-green-600 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          {togglingId === store.id ? '...' : store.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-4">
            <p className="text-sm text-[var(--ds-text-muted)]">
              الصفحة {page} من {totalPages}
            </p>
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


