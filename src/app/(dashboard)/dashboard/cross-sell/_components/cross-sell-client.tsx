'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'

type Product = {
  id: string
  name: string
  price: string
  images: string[]
}

type Relation = {
  relation: {
    id: string
    storeId: string
    productId: string
    relatedProductId: string
    relationType: string
    sortOrder: number
    createdAt: string
  }
  relatedProduct: {
    id: string
    name: string
    price: string
    images: string[]
  }
}

interface CrossSellClientProps {
  initialProducts: Product[]
}

export default function CrossSellClient({ initialProducts }: CrossSellClientProps) {
  const products = initialProducts
  const [selectedProductId, setSelectedProductId] = useState('')
  const [relations, setRelations] = useState<Relation[]>([])
  const [relLoading, setRelLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [relatedProductId, setRelatedProductId] = useState('')

  const fetchRelations = useCallback(async (productId: string) => {
    if (!productId) {
      setRelations([])
      return
    }
    setRelLoading(true)
    try {
      const res = await fetch(`/api/dashboard/products/${productId}/relations`)
      const data = await res.json()
      if (data.success) {
        setRelations(data.data)
      }
    } catch {
      setError('تعذر تحميل العلاقات')
    } finally {
      setRelLoading(false)
    }
  }, [])

  function handleProductChange(productId: string) {
    setSelectedProductId(productId)
    setRelatedProductId('')
    setError(null)
    setNotice(null)
    fetchRelations(productId)
  }

  async function handleAdd() {
    if (!selectedProductId || !relatedProductId) {
      setError('يجب اختيار المنتج الأساسي والمنتج المرتبط')
      return
    }

    if (selectedProductId === relatedProductId) {
      setError('لا يمكن ربط منتج بنفسه')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/dashboard/products/${selectedProductId}/relations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relatedProductId,
          relationType: 'cross_sell',
        }),
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'حدث خطأ')
        return
      }

      setNotice('تم إضافة المنتج المرتبط بنجاح')
      setRelatedProductId('')
      await fetchRelations(selectedProductId)
    } catch {
      setError('حدث خطأ أثناء الحفظ')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(relationId: string) {
    if (!confirm('هل أنت متأكد من حذف هذه العلاقة؟')) return

    try {
      const res = await fetch(
        `/api/dashboard/products/${selectedProductId}/relations?relationId=${relationId}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (data.success) {
        setNotice('تم حذف العلاقة')
        await fetchRelations(selectedProductId)
      } else {
        setError(data.error || 'تعذر الحذف')
      }
    } catch {
      setError('حدث خطأ أثناء الحذف')
    }
  }

  // Products not yet linked for the selected product
  const linkedIds = new Set(relations.map((r) => r.relation.relatedProductId))
  linkedIds.add(selectedProductId)
  const availableProducts = products.filter((p) => !linkedIds.has(p.id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">منتجات مرتبطة (Cross-sell)</h1>
        <p className="text-sm text-[var(--ds-text-muted)]">
          اربط المنتجات ببعضها لعرض اقتراحات &quot;منتجات قد تعجبك&quot; في صفحة المنتج.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</div>
      )}

      {/* Product selector */}
      <div className="card-surface p-4 sm:p-6">
        <label className="mb-2 block text-sm font-medium">اختر المنتج الأساسي</label>
        <select
          value={selectedProductId}
          onChange={(e) => handleProductChange(e.target.value)}
          className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2 sm:max-w-md"
        >
          <option value="">اختر منتج...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <>
          {/* Add relation form */}
          <div className="card-surface p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold">إضافة منتج مرتبط</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">المنتج المرتبط</label>
                <select
                  value={relatedProductId}
                  onChange={(e) => setRelatedProductId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                >
                  <option value="">اختر منتج...</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => void handleAdd()}
                disabled={saving || !relatedProductId}
                className="rounded-lg bg-[var(--ds-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
              >
                {saving ? 'جاري الحفظ...' : '+ إضافة'}
              </button>
            </div>
          </div>

          {/* Relations list */}
          <div className="card-surface p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold">
              المنتجات المرتبطة ({relations.length})
            </h2>

            {relLoading ? (
              <p className="py-6 text-center text-sm text-[var(--ds-text-muted)]">جاري التحميل...</p>
            ) : relations.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--ds-text-muted)]">
                لا توجد منتجات مرتبطة بعد. أضف منتجات ليتم عرضها كاقتراحات.
              </p>
            ) : (
              <div className="space-y-3">
                {relations.map((item) => (
                  <div
                    key={item.relation.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--ds-border)] p-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.relatedProduct.images[0] && (
                        <div className="h-12 w-12 overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]">
                          <Image
                            src={item.relatedProduct.images[0]}
                            alt={item.relatedProduct.name}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[var(--ds-text)]">{item.relatedProduct.name}</p>
                        <p className="text-xs text-[var(--ds-text-muted)]">
                          {item.relation.relationType === 'cross_sell' ? 'Cross-sell' : item.relation.relationType}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleDelete(item.relation.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
