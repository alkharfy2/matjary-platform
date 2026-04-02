import { db } from '@/db'
import { storeSupplierProducts, storeProducts } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DropshippingPage() {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/dropshipping' })
  if (access.status !== 'ok') redirect('/dashboard')
  const { store } = access

  const links = await db
    .select({
      supplierProduct: storeSupplierProducts,
      productName: storeProducts.name,
      productImage: storeProducts.images,
    })
    .from(storeSupplierProducts)
    .leftJoin(storeProducts, eq(storeSupplierProducts.productId, storeProducts.id))
    .where(eq(storeSupplierProducts.storeId, store.id))
    .orderBy(desc(storeSupplierProducts.createdAt))

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      avgMargin: sql<string>`COALESCE(AVG((retail_price::numeric - supplier_price::numeric) / NULLIF(retail_price::numeric, 0) * 100), 0)`,
    })
    .from(storeSupplierProducts)
    .where(eq(storeSupplierProducts.storeId, store.id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dropshipping</h1>
        <Link
          href="/dashboard/dropshipping/link"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ds-primary)' }}
        >
          + ربط منتج بمورد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>المنتجات المربوطة</p>
          <p className="mt-1 text-2xl font-bold">{stats?.total ?? 0}</p>
        </div>
        <div className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
          <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>متوسط هامش الربح</p>
          <p className="mt-1 text-2xl font-bold">{Number(stats?.avgMargin ?? 0).toFixed(1)}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden rounded-lg border" style={{ borderColor: 'var(--ds-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
              <th className="px-4 py-3 text-right font-medium">المنتج</th>
              <th className="px-4 py-3 text-right font-medium">المورد</th>
              <th className="px-4 py-3 text-right font-medium">سعر المورد</th>
              <th className="px-4 py-3 text-right font-medium">سعر البيع</th>
              <th className="px-4 py-3 text-right font-medium">هامش الربح</th>
              <th className="px-4 py-3 text-right font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center" style={{ color: 'var(--ds-text-muted)' }}>
                  لا يوجد منتجات مربوطة بموردين
                </td>
              </tr>
            )}
            {links.map((item) => {
              const sp = Number(item.supplierProduct.supplierPrice)
              const rp = Number(item.supplierProduct.retailPrice)
              const margin = rp > 0 ? ((rp - sp) / rp * 100).toFixed(1) : '0'
              const images = item.productImage as string[] | null

              return (
                <tr key={item.supplierProduct.id} className="border-b" style={{ borderColor: 'var(--ds-border)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {images?.[0] && (
                        <img src={images[0]} alt="" className="h-8 w-8 rounded object-cover" />
                      )}
                      <span>{item.productName || 'منتج محذوف'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.supplierProduct.supplierName}</td>
                  <td className="px-4 py-3">{sp.toFixed(2)} EGP</td>
                  <td className="px-4 py-3">{rp.toFixed(2)} EGP</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${Number(margin) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {item.supplierProduct.supplierProductUrl && (
                        <a
                          href={item.supplierProduct.supplierProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline"
                          style={{ color: 'var(--ds-primary)' }}
                        >
                          المورد ↗
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
