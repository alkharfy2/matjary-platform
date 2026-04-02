import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { storeSupplierProducts, storeProducts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const supplierProductSchema = z.object({
  productId: z.string().uuid().optional(),
  supplierName: z.string().min(1, { error: 'اسم المورد مطلوب' }).max(200),
  supplierProductUrl: z.string().url({ error: 'رابط غير صالح' }).optional(),
  supplierPrice: z.coerce.number().min(0),
  retailPrice: z.coerce.number().min(0),
  autoOrder: z.boolean().default(false),
  leadTimeDays: z.coerce.number().int().min(1).max(365).default(7),
  notes: z.string().max(500).optional(),
})

export default async function LinkDropshippingPage() {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/dropshipping/link' })
  if (access.status !== 'ok') redirect('/dashboard')
  const { store } = access

  const products = await db
    .select({ id: storeProducts.id, name: storeProducts.name })
    .from(storeProducts)
    .where(eq(storeProducts.storeId, store.id))

  async function linkProduct(formData: FormData) {
    'use server'
    const access = await getDashboardStoreAccessContext({ path: '/dashboard/dropshipping/link' })
    if (access.status !== 'ok') redirect('/dashboard')

    const parsed = supplierProductSchema.safeParse({
      productId: formData.get('productId') || undefined,
      supplierName: formData.get('supplierName'),
      supplierProductUrl: formData.get('supplierProductUrl') || undefined,
      supplierPrice: formData.get('supplierPrice'),
      retailPrice: formData.get('retailPrice'),
      autoOrder: formData.get('autoOrder') === 'on',
      leadTimeDays: formData.get('leadTimeDays') || 7,
      notes: formData.get('notes') || undefined,
    })

    if (!parsed.success) {
      redirect('/dashboard/dropshipping/link?error=' + encodeURIComponent(parsed.error.issues[0]?.message ?? 'خطأ'))
    }

    if (parsed.data.retailPrice <= parsed.data.supplierPrice) {
      redirect('/dashboard/dropshipping/link?error=' + encodeURIComponent('سعر البيع لازم يكون أكبر من سعر المورد'))
    }

    await db.insert(storeSupplierProducts).values({
      storeId: access.store.id,
      productId: parsed.data.productId ?? null,
      supplierName: parsed.data.supplierName,
      supplierProductUrl: parsed.data.supplierProductUrl ?? null,
      supplierPrice: String(parsed.data.supplierPrice),
      retailPrice: String(parsed.data.retailPrice),
      autoOrder: parsed.data.autoOrder,
      leadTimeDays: parsed.data.leadTimeDays,
      notes: parsed.data.notes ?? null,
    })

    redirect('/dashboard/dropshipping')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">ربط منتج بمورد</h1>

      <form action={linkProduct} className="card-surface space-y-4 rounded-lg border p-6" style={{ borderColor: 'var(--ds-border)' }}>
        <div>
          <label className="mb-1 block text-sm font-medium">المنتج (اختياري)</label>
          <select
            name="productId"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            <option value="">بدون ربط بمنتج</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">اسم المورد *</label>
          <input
            type="text"
            name="supplierName"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="مثلاً: AliExpress Store #123"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">رابط المنتج عند المورد</label>
          <input
            type="url"
            name="supplierProductUrl"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">سعر المورد *</label>
            <input
              type="number"
              name="supplierPrice"
              required
              min="0"
              step="0.01"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--ds-border)' }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">سعر البيع *</label>
            <input
              type="number"
              name="retailPrice"
              required
              min="0"
              step="0.01"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--ds-border)' }}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">مدة التوصيل (أيام)</label>
          <input
            type="number"
            name="leadTimeDays"
            min="1"
            max="365"
            defaultValue="7"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">ملاحظات</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--ds-border)' }}
            placeholder="ملاحظات إضافية..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="autoOrder" id="autoOrder" className="rounded" />
          <label htmlFor="autoOrder" className="text-sm">طلب تلقائي للمورد عند استلام طلب</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-lg px-6 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--ds-primary)' }}
          >
            ربط المنتج
          </button>
          <a
            href="/dashboard/dropshipping"
            className="rounded-lg border px-6 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--ds-border)' }}
          >
            إلغاء
          </a>
        </div>
      </form>
    </div>
  )
}
