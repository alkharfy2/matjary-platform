export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders, stores } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { createKashierSession } from '@/lib/payments/kashier'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'
import { z } from 'zod'

/**
 * POST /api/payments/kashier/create
 * إنشاء جلسة دفع Kashier لطلب موجود
 * يُستخدم لإعادة المحاولة عند فشل الدفع الأول
 *
 * الحماية:
 * - Rate limiting: 5 طلبات / دقيقة لكل IP
 * - التحقق من هوية العميل عبر رقم الهاتف (يمنع أي شخص من إنشاء جلسة لطلب مش بتاعه)
 * - التحقق من حالة الطلب (مش ملغي أو مدفوع)
 */

/** Rate limit: 5 محاولات / دقيقة لكل IP */
const RATE_LIMIT_PAYMENT_CREATE = {
  maxRequests: 5,
  windowSeconds: 60,
} as const

/** الحالات اللي مش مسموح فيها إنشاء جلسة دفع جديدة */
const BLOCKED_ORDER_STATUSES = new Set(['cancelled', 'refunded', 'delivered'])

const createPaymentSchema = z.object({
  orderId: z.string().uuid({ error: 'معرف الطلب غير صالح' }),
  customerPhone: z
    .string()
    .min(10, 'رقم الهاتف غير صالح')
    .max(15, 'رقم الهاتف غير صالح'),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting — حماية ضد spam
    const ip = getClientIp(request)
    const rl = rateLimit(`kashier-create:${ip}`, RATE_LIMIT_PAYMENT_CREATE)
    if (!rl.allowed) {
      return apiError(
        'تم تجاوز الحد الأقصى للمحاولات. حاول بعد دقيقة.',
        429,
        'RATE_LIMITED',
      )
    }

    // 2. Validation
    const body = await request.json()
    const parsed = createPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(
        parsed.error.issues[0]?.message ?? 'بيانات غير صالحة',
      )
    }

    const { orderId, customerPhone } = parsed.data

    // 3. جلب الطلب
    const order = await db
      .select({
        id: storeOrders.id,
        storeId: storeOrders.storeId,
        orderNumber: storeOrders.orderNumber,
        total: storeOrders.total,
        paymentMethod: storeOrders.paymentMethod,
        paymentStatus: storeOrders.paymentStatus,
        orderStatus: storeOrders.orderStatus,
        customerName: storeOrders.customerName,
        customerPhone: storeOrders.customerPhone,
        customerEmail: storeOrders.customerEmail,
      })
      .from(storeOrders)
      .where(eq(storeOrders.id, orderId))
      .limit(1)

    if (!order[0]) {
      return ApiErrors.notFound('الطلب')
    }

    const orderData = order[0]

    // 4. التحقق من هوية العميل — يمنع أي حد يبعت orderId عشوائي من الـ console
    if (orderData.customerPhone !== customerPhone) {
      console.warn('Kashier create: phone mismatch — unauthorized attempt', {
        orderId,
        ip,
      })
      return apiError(
        'بيانات التحقق غير صحيحة',
        403,
        'UNAUTHORIZED',
      )
    }

    // 5. التحقق أن طريقة الدفع kashier
    if (orderData.paymentMethod !== 'kashier') {
      return apiError(
        'طلب الدفع غير متاح — طريقة الدفع ليست Kashier',
        422,
        'INVALID_PAYMENT_METHOD',
      )
    }

    // 6. التحقق أن الدفع لم يتم بالفعل
    if (orderData.paymentStatus === 'paid') {
      return apiError('تم الدفع بالفعل لهذا الطلب', 422, 'ALREADY_PAID')
    }

    // 7. التحقق أن الطلب مش ملغي أو منتهي
    if (BLOCKED_ORDER_STATUSES.has(orderData.orderStatus)) {
      return apiError(
        'لا يمكن إنشاء جلسة دفع لطلب ملغي أو منتهي',
        422,
        'ORDER_NOT_PAYABLE',
      )
    }

    // 8. جلب عملة المتجر
    const store = await db
      .select({ settings: stores.settings })
      .from(stores)
      .where(eq(stores.id, orderData.storeId))
      .limit(1)

    if (!store[0]) {
      return ApiErrors.storeNotFound()
    }

    const currency = store[0].settings.currency

    // 9. إنشاء جلسة دفع (المبلغ يتم من السيرفر مباشرة — لا يمكن تغييره من العميل)
    const { redirectUrl } = await createKashierSession({
      orderId: orderData.id,
      orderNumber: orderData.orderNumber,
      amount: orderData.total,
      currency,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      storeId: orderData.storeId,
    })

    // 10. تحديث حالة الدفع إلى "بانتظار الدفع"
    await db
      .update(storeOrders)
      .set({ paymentStatus: 'awaiting_payment', updatedAt: new Date() })
      .where(
        and(
          eq(storeOrders.id, orderId),
          eq(storeOrders.storeId, orderData.storeId),
        ),
      )

    return apiSuccess({ orderId: orderData.id, redirectUrl })
  } catch (error) {
    console.error('Error creating Kashier payment session:', error)
    return handleApiError(error)
  }
}
