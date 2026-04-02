import { notFound } from 'next/navigation'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { storeLoyaltyPoints } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { formatDate } from '@/lib/utils'
import { redirect } from 'next/navigation'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'

function getTypeLabel(type: string) {
  if (type === 'earned') return 'كسب'
  if (type === 'redeemed') return 'استبدال'
  if (type === 'expired') return 'انتهاء'
  if (type === 'adjusted') return 'تعديل'
  return type
}

function getTypeColor(type: string) {
  if (type === 'earned') return 'text-green-700 bg-green-100'
  if (type === 'redeemed') return 'text-blue-700 bg-blue-100'
  if (type === 'expired') return 'text-red-700 bg-red-100'
  return 'text-gray-700 bg-gray-100'
}

type LoyaltySettingsForm = {
  loyaltyEnabled: boolean
  loyaltyPointsPerEgp: number
  loyaltyPointValue: number
  loyaltyMinRedemption: number
  loyaltyMaxRedemptionPercent: number
}

export default async function LoyaltyPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const settings = store.settings as Record<string, unknown>
  const loyaltySettings: LoyaltySettingsForm = {
    loyaltyEnabled: Boolean(settings?.loyaltyEnabled),
    loyaltyPointsPerEgp: (settings?.loyaltyPointsPerEgp as number) || 1,
    loyaltyPointValue: (settings?.loyaltyPointValue as number) || 0.1,
    loyaltyMinRedemption: (settings?.loyaltyMinRedemption as number) || 100,
    loyaltyMaxRedemptionPercent: (settings?.loyaltyMaxRedemptionPercent as number) || 50,
  }

  const [transactions, statsResult] = await Promise.all([
    db
      .select()
      .from(storeLoyaltyPoints)
      .where(eq(storeLoyaltyPoints.storeId, store.id))
      .orderBy(desc(storeLoyaltyPoints.createdAt))
      .limit(50),

    db
      .select({
        totalEarned: sql<number>`COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0)::int`,
        totalRedeemed: sql<number>`COALESCE(SUM(CASE WHEN type = 'redeemed' THEN ABS(points) ELSE 0 END), 0)::int`,
        totalExpired: sql<number>`COALESCE(SUM(CASE WHEN type = 'expired' THEN ABS(points) ELSE 0 END), 0)::int`,
      })
      .from(storeLoyaltyPoints)
      .where(eq(storeLoyaltyPoints.storeId, store.id)),
  ])

  const stats = statsResult[0] ?? { totalEarned: 0, totalRedeemed: 0, totalExpired: 0 }
  const activePoints = stats.totalEarned - stats.totalRedeemed - stats.totalExpired

  async function saveLoyaltySettings(formData: FormData) {
    'use server'

    const access = await getDashboardStoreAccessContext({ path: '/dashboard/loyalty' })
    if (access.status !== 'ok') redirect('/dashboard')
    const { store: s } = access

    const loyaltyEnabled = formData.get('loyaltyEnabled') === 'on'
    const loyaltyPointsPerEgp = parseFloat(String(formData.get('loyaltyPointsPerEgp') ?? '1'))
    const loyaltyPointValue = parseFloat(String(formData.get('loyaltyPointValue') ?? '0.1'))
    const loyaltyMinRedemption = parseInt(String(formData.get('loyaltyMinRedemption') ?? '100'))
    const loyaltyMaxRedemptionPercent = parseInt(String(formData.get('loyaltyMaxRedemptionPercent') ?? '50'))

    const { stores } = await import('@/db/schema')
    const { eq: eqOp } = await import('drizzle-orm')
    const { db: database } = await import('@/db')

    const updateData: Record<string, unknown> = {
      settings: {
        ...s.settings,
        loyaltyEnabled,
        loyaltyPointsPerEgp: isNaN(loyaltyPointsPerEgp) ? 1 : loyaltyPointsPerEgp,
        loyaltyPointValue: isNaN(loyaltyPointValue) ? 0.1 : loyaltyPointValue,
        loyaltyMinRedemption: isNaN(loyaltyMinRedemption) ? 100 : loyaltyMinRedemption,
        loyaltyMaxRedemptionPercent: isNaN(loyaltyMaxRedemptionPercent) ? 50 : loyaltyMaxRedemptionPercent,
      },
      updatedAt: new Date(),
    }

    await database
      .update(stores)
      .set(updateData)
      .where(eqOp(stores.id, s.id))

    redirect('/dashboard/loyalty?saved=1')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">نقاط الولاء</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'نقاط ممنوحة', value: stats.totalEarned, color: 'text-green-600' },
          { label: 'نقاط مستبدلة', value: stats.totalRedeemed, color: 'text-blue-600' },
          { label: 'نقاط منتهية', value: stats.totalExpired, color: 'text-red-600' },
          { label: 'نقاط نشطة', value: activePoints, color: 'text-[var(--ds-primary)]' },
        ].map((stat) => (
          <div key={stat.label} className="card-surface p-4 text-center">
            <p className="text-sm text-[var(--ds-text-muted)]">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value.toLocaleString('ar-EG')}</p>
          </div>
        ))}
      </div>

      {/* Settings */}
      <form action={saveLoyaltySettings} className="card-surface p-4 sm:p-6 space-y-4">
        <h2 className="text-lg font-semibold">إعدادات الولاء</h2>

        <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--ds-border)] px-3 py-2">
          <input type="checkbox" name="loyaltyEnabled" defaultChecked={loyaltySettings.loyaltyEnabled} />
          <span>تفعيل نظام الولاء</span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">معدل كسب النقاط (نقطة لكل جنيه)</label>
            <input name="loyaltyPointsPerEgp" type="number" step="0.01" min="0" defaultValue={loyaltySettings.loyaltyPointsPerEgp} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">قيمة النقطة (جنيه)</label>
            <input name="loyaltyPointValue" type="number" step="0.01" min="0" defaultValue={loyaltySettings.loyaltyPointValue} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">أقل عدد نقاط للاستبدال</label>
            <input name="loyaltyMinRedemption" type="number" min="0" defaultValue={loyaltySettings.loyaltyMinRedemption} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">أقصى نسبة خصم من الطلب (%)</label>
            <input name="loyaltyMaxRedemptionPercent" type="number" min="0" max="100" defaultValue={loyaltySettings.loyaltyMaxRedemptionPercent} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)]">
            حفظ الإعدادات
          </button>
        </div>
      </form>

      {/* Transactions */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-[var(--ds-surface-muted)]">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">العميل</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">النوع</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">النقاط</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">ملاحظة</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--ds-text-muted)]">
                    لا توجد عمليات نقاط بعد.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--ds-border)]/70">
                    <td className="px-6 py-4 text-sm" dir="ltr">{t.customerPhone}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${getTypeColor(t.type)}`}>
                        {getTypeLabel(t.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {t.points > 0 ? `+${t.points}` : t.points}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">{t.notes || '—'}</td>
                    <td className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">{formatDate(t.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
