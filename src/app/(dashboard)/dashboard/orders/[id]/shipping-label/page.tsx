import { notFound } from 'next/navigation'
import { db } from '@/db'
import { storeOrders, stores } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import type { ShippingAddress } from '@/db/schema'

type Params = { params: Promise<{ id: string }> }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ShippingLabelPage({ params }: Params) {
  const { id } = await params
  if (!UUID_REGEX.test(id)) notFound()
  const resolvedStore = await getCurrentStore()
  if (!resolvedStore) notFound()

  // Query full store record for contact fields
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, resolvedStore.id))
    .limit(1)
  if (!store) notFound()

  const order = await db
    .select()
    .from(storeOrders)
    .where(and(eq(storeOrders.id, id), eq(storeOrders.storeId, resolvedStore.id)))
    .limit(1)

  if (!order[0]) notFound()

  const o = order[0]
  const addr = o.shippingAddress as ShippingAddress | null
  const isCOD = o.paymentMethod === 'cod'
  const storeSettings = store.settings as { currency?: string }

  return (
    <div className="print-content mx-auto max-w-md bg-white p-6" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(.print-content) { display: none !important; }
          .no-print { display: none !important; }
          .print-content { position: static !important; margin: 0 !important; padding: 15px !important; }
          @page { size: A5; margin: 10mm; }
        }
      `}} />

      {/* رقم الطلب — كبير */}
      <div className="mb-4 border-b-2 border-black pb-3 text-center">
        <p className="text-3xl font-black">#{o.orderNumber}</p>
      </div>

      {/* المحافظة — كبير */}
      {addr?.governorate && (
        <div className="mb-4 rounded-lg border-2 border-dashed border-gray-400 p-3 text-center">
          <p className="text-4xl font-black">{addr.governorate}</p>
        </div>
      )}

      {/* المُرسل */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <h3 className="mb-1 text-sm font-bold text-gray-500">المُرسل</h3>
        <p className="text-lg font-semibold">{store.name}</p>
        {store.contactPhone && <p className="text-sm">{store.contactPhone}</p>}
      </div>

      {/* المُستلم */}
      <div className="mb-4 rounded-lg bg-gray-50 p-3">
        <h3 className="mb-1 text-sm font-bold text-gray-500">المُستلم</h3>
        <p className="text-lg font-semibold">{o.customerName}</p>
        <p className="text-sm">{o.customerPhone}</p>
        {addr && (
          <p className="mt-1 text-sm">
            {addr.area}, {addr.city}, {addr.governorate}
            {addr.street && ` — ${addr.street}`}
          </p>
        )}
      </div>

      {/* المبلغ المطلوب (COD) */}
      {isCOD && (
        <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-3 text-center">
          <p className="text-sm font-bold text-red-600">مبلغ الدفع عند الاستلام</p>
          <p className="text-2xl font-black text-red-700">{o.total} {storeSettings.currency === 'EGP' ? 'ج.م' : (storeSettings.currency ?? 'ج.م')}</p>
        </div>
      )}

      {/* ملاحظات الطلب */}
      {o.notes && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-3">
          <h3 className="mb-1 text-sm font-bold text-yellow-700">ملاحظات</h3>
          <p className="text-sm">{o.notes}</p>
        </div>
      )}

      {/* Print Button */}
      <div className="no-print text-center">
        <button
          type="button"
          id="print-btn"
          className="rounded-lg bg-gray-900 px-6 py-2 text-white hover:bg-gray-700"
        >
          🖨️ طباعة البوليصة
        </button>
        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click', function() { window.print(); })` }} />
      </div>
    </div>
  )
}
