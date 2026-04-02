import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { storeAffiliates } from '@/db/schema'
import { z } from 'zod'

const affiliateSchema = z.object({
  name: z.string().min(2, { error: 'الاسم مطلوب (حرفين على الأقل)' }).max(100),
  email: z.string().email({ error: 'إيميل غير صالح' }).optional(),
  phone: z.string().min(10, { error: 'رقم الهاتف قصير' }).max(15),
  code: z.string().min(3, { error: 'الكود لازم 3 أحرف على الأقل' }).max(30).regex(/^[A-Za-z0-9_-]+$/, { error: 'الكود يحتوي على أحرف وأرقام وشرطات فقط' }),
  commissionRate: z.coerce.number().min(0.01).max(50),
})

export default async function NewAffiliatePage() {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/affiliates/new' })
  if (access.status !== 'ok') redirect('/dashboard')
  const { store } = access

  async function createAffiliate(formData: FormData) {
    'use server'
    const access = await getDashboardStoreAccessContext({ path: '/dashboard/affiliates/new' })
    if (access.status !== 'ok') redirect('/dashboard')

    const parsed = affiliateSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email') || undefined,
      phone: formData.get('phone'),
      code: formData.get('code'),
      commissionRate: formData.get('commissionRate'),
    })

    if (!parsed.success) {
      redirect('/dashboard/affiliates/new?error=' + encodeURIComponent(parsed.error.issues[0]?.message ?? 'خطأ في البيانات'))
    }

    await db.insert(storeAffiliates).values({
      storeId: access.store.id,
      ...parsed.data,
      commissionRate: String(parsed.data.commissionRate),
      email: parsed.data.email ?? null,
      isActive: true,
    })

    redirect('/dashboard/affiliates')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">إضافة مسوق جديد</h1>

      <form action={createAffiliate} className="card-surface space-y-4 rounded-lg border p-6" style={{ borderColor: 'var(--ds-border)' }}>
        <div>
          <label className="mb-1 block text-sm font-medium">الاسم *</label>
          <input
            type="text"
            name="name"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="اسم المسوق"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">رقم الهاتف *</label>
          <input
            type="tel"
            name="phone"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="01xxxxxxxxx"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">الإيميل (اختياري)</label>
          <input
            type="email"
            name="email"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">كود الإحالة *</label>
          <input
            type="text"
            name="code"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="AHMED2024"
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--ds-text-muted)' }}>أحرف وأرقام وشرطات فقط</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">نسبة العمولة % *</label>
          <input
            type="number"
            name="commissionRate"
            required
            min="0.01"
            max="50"
            step="0.01"
            defaultValue="10"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg px-6 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--ds-primary)' }}
          >
            إضافة المسوق
          </button>
          <Link
            href="/dashboard/affiliates"
            className="rounded-lg border px-6 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            إلغاء
          </Link>
        </div>
      </form>
    </div>
  )
}
