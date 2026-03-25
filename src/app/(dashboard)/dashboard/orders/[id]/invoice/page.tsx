import { notFound } from 'next/navigation'
import { db } from '@/db'
import { storeOrders, storeOrderItems, stores } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import type { ShippingAddress } from '@/db/schema'

type Params = { params: Promise<{ id: string }> }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function InvoicePage({ params }: Params) {
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

  const items = await db
    .select()
    .from(storeOrderItems)
    .where(eq(storeOrderItems.orderId, id))

  const o = order[0]
  const addr = o.shippingAddress as ShippingAddress | null
  const storeSettings = store.settings as { currency?: string }
  const currency = storeSettings.currency === 'EGP' ? 'ج.م' : (storeSettings.currency ?? 'ج.م')

  return (
    <div className="print-content mx-auto max-w-3xl bg-white p-8" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(.print-content) { display: none !important; }
          .no-print { display: none !important; }
          .print-content { position: static !important; margin: 0 !important; padding: 20px !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}} />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          {store.contactPhone && <p className="text-sm text-gray-500">{store.contactPhone}</p>}
          {store.contactEmail && <p className="text-sm text-gray-500">{store.contactEmail}</p>}
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold text-gray-900">فاتورة</h2>
          <p className="text-sm text-gray-500">#{o.orderNumber}</p>
          <p className="text-sm text-gray-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-EG') : ''}</p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-8 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-semibold text-gray-700">بيانات العميل</h3>
        <p>الاسم: {o.customerName}</p>
        <p>الهاتف: {o.customerPhone}</p>
        {o.customerEmail && <p>الإيميل: {o.customerEmail}</p>}
        {addr && <p>العنوان: {addr.area}, {addr.city}, {addr.governorate}</p>}
        {addr?.street && <p>الشارع: {addr.street}</p>}
      </div>

      {/* Items Table */}
      <table className="mb-8 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="px-2 py-3 text-start text-sm font-semibold">المنتج</th>
            <th className="px-2 py-3 text-center text-sm font-semibold">الكمية</th>
            <th className="px-2 py-3 text-center text-sm font-semibold">سعر الوحدة</th>
            <th className="px-2 py-3 text-end text-sm font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="px-2 py-3 text-sm">{item.name}</td>
              <td className="px-2 py-3 text-center text-sm">{item.quantity}</td>
              <td className="px-2 py-3 text-center text-sm">{item.price} {currency}</td>
              <td className="px-2 py-3 text-end text-sm">{item.total} {currency}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mb-8 ms-auto w-64 space-y-2">
        <div className="flex justify-between text-sm">
          <span>المجموع الفرعي</span>
          <span>{o.subtotal} {currency}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>الشحن</span>
          <span>{o.shippingCost} {currency}</span>
        </div>
        {Number(o.discount) > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>الخصم</span>
            <span>-{o.discount} {currency}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 text-lg font-bold">
          <span>الإجمالي</span>
          <span>{o.total} {currency}</span>
        </div>
      </div>

      {/* Payment Info */}
      <div className="mb-8 text-sm text-gray-500">
        <p>طريقة الدفع: {o.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني'}</p>
        <p>حالة الدفع: {o.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</p>
      </div>

      {/* Print Button */}
      <div className="no-print text-center">
        <button
          type="button"
          id="print-btn"
          className="rounded-lg bg-gray-900 px-6 py-2 text-white hover:bg-gray-700"
        >
          🖨️ طباعة الفاتورة
        </button>
        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').addEventListener('click', function() { window.print(); })` }} />
      </div>
    </div>
  )
}
