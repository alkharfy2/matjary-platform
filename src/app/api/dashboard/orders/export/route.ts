/**
 * GET /api/dashboard/orders/export?status=all&search=
 *
 * يصدّر الطلبات كملف CSV.
 * محمي بـ verifyStoreOwnership().
 */

import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiError } from '@/lib/api/response'
import { generateCsv } from '@/lib/export/csv'

const MAX_EXPORT_ROWS = 5000

export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return apiError('غير مصرح', 401)

    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? 'all'
    const search = url.searchParams.get('search') ?? ''

    // بناء الشروط
    const conditions = [eq(storeOrders.storeId, store.id)]

    if (status !== 'all') {
      conditions.push(eq(storeOrders.orderStatus, status))
    }

    if (search) {
      conditions.push(
        or(
          ilike(storeOrders.orderNumber, `%${search}%`),
          ilike(storeOrders.customerName, `%${search}%`),
          ilike(storeOrders.customerPhone, `%${search}%`),
        )!,
      )
    }

    // جلب الطلبات
    const orders = await db
      .select()
      .from(storeOrders)
      .where(and(...conditions))
      .orderBy(desc(storeOrders.createdAt))
      .limit(MAX_EXPORT_ROWS)

    // تعريف الأعمدة
    const csv = generateCsv(orders, [
      { header: 'رقم الطلب', accessor: r => r.orderNumber },
      { header: 'اسم العميل', accessor: r => r.customerName },
      { header: 'رقم الموبايل', accessor: r => r.customerPhone },
      { header: 'الإيميل', accessor: r => r.customerEmail },
      { header: 'المحافظة', accessor: r => {
        const addr = r.shippingAddress as Record<string, string> | null
        return addr?.governorate ?? ''
      }},
      { header: 'المدينة', accessor: r => {
        const addr = r.shippingAddress as Record<string, string> | null
        return addr?.city ?? ''
      }},
      { header: 'المنطقة', accessor: r => {
        const addr = r.shippingAddress as Record<string, string> | null
        return addr?.area ?? ''
      }},
      { header: 'الشارع', accessor: r => {
        const addr = r.shippingAddress as Record<string, string> | null
        return addr?.street ?? ''
      }},
      { header: 'المجموع الفرعي', accessor: r => r.subtotal },
      { header: 'الشحن', accessor: r => r.shippingCost },
      { header: 'الخصم', accessor: r => r.discount },
      { header: 'الإجمالي', accessor: r => r.total },
      { header: 'كود الخصم', accessor: r => r.couponCode },
      { header: 'طريقة الدفع', accessor: r => r.paymentMethod === 'cod' ? 'عند الاستلام' : 'إلكتروني' },
      { header: 'حالة الدفع', accessor: r => r.paymentStatus },
      { header: 'حالة الطلب', accessor: r => r.orderStatus },
      { header: 'رقم التتبع', accessor: r => r.trackingNumber },
      { header: 'شركة الشحن', accessor: r => r.shippingCompany },
      { header: 'ملاحظات', accessor: r => r.notes },
      { header: 'تاريخ الطلب', accessor: r => r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : '' },
    ])

    // إرجاع CSV كملف downloadable
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="orders-${store.slug}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('[Export] Error:', error)
    return apiError('حدث خطأ أثناء التصدير', 500)
  }
}
