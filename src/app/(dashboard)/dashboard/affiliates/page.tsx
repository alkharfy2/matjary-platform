import { db } from '@/db'
import { storeAffiliates } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AffiliatesPage() {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/affiliates' })
  if (access.status !== 'ok') redirect('/dashboard')
  const { store } = access

  const affiliates = await db
    .select()
    .from(storeAffiliates)
    .where(eq(storeAffiliates.storeId, store.id))
    .orderBy(desc(storeAffiliates.createdAt))

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE is_active = true)::int`,
      totalCommission: sql<string>`COALESCE(SUM(total_commission::numeric), 0)`,
      pendingCommission: sql<string>`COALESCE(SUM(pending_commission::numeric), 0)`,
    })
    .from(storeAffiliates)
    .where(eq(storeAffiliates.storeId, store.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المسوقين بالعمولة</h1>
        <Link
          href="/dashboard/affiliates/new"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ds-primary)' }}
        >
          + إضافة مسوق
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>إجمالي المسوقين</p>
          <p className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>النشطين</p>
          <p className="mt-1 text-2xl font-bold">{stats?.active ?? 0}</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>إجمالي العمولات</p>
          <p className="mt-1 text-2xl font-bold">{Number(stats?.totalCommission ?? 0).toFixed(2)} EGP</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>عمولات معلقة</p>
          <p className="mt-1 text-2xl font-bold">{Number(stats?.pendingCommission ?? 0).toFixed(2)} EGP</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ds-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
              <th className="px-4 py-3 text-right font-medium">الاسم</th>
              <th className="px-4 py-3 text-right font-medium">الكود</th>
              <th className="px-4 py-3 text-right font-medium">العمولة %</th>
              <th className="px-4 py-3 text-right font-medium">المبيعات</th>
              <th className="px-4 py-3 text-right font-medium">الأرباح</th>
              <th className="px-4 py-3 text-right font-medium">الحالة</th>
              <th className="px-4 py-3 text-right font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--ds-text-muted)' }}>
                  لا يوجد مسوقين حتى الآن
                </td>
              </tr>
            )}
            {affiliates.map((aff) => (
              <tr key={aff.id} className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{aff.name}</p>
                    <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{aff.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <code className="rounded bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">{aff.code}</code>
                </td>
                <td className="px-4 py-3">{aff.commissionRate}%</td>
                <td className="px-4 py-3">{Number(aff.totalSales).toFixed(2)} EGP</td>
                <td className="px-4 py-3">{Number(aff.totalCommission).toFixed(2)} EGP</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    aff.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {aff.isActive ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/affiliates/${aff.id}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: 'var(--ds-primary)' }}
                  >
                    التفاصيل
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
