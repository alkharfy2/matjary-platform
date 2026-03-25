import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders, stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifyKashierSignature } from '@/lib/payments/kashier'
import type { KashierWebhookPayload } from '@/lib/payments/kashier'
import { apiSuccess, apiError } from '@/lib/api/response'

/** القيم المسموحة لحالة الدفع من Kashier */
const ALLOWED_STATUSES = new Set(['SUCCESS', 'FAILED', 'FAILURE', 'PENDING'])

/** العملة الوحيدة المدعومة — جنيه مصري */
const ALLOWED_CURRENCY = 'EGP'

/**
 * POST /api/payments/kashier/webhook
 * استقبال إشعارات الدفع من Kashier (server-to-server)
 *
 * يُستدعى من خوادم Kashier بعد إتمام أو فشل عملية الدفع
 * لا يحتاج مصادقة — يعتمد على التحقق من التوقيع (HMAC-SHA256)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as KashierWebhookPayload

    // 1. التحقق من وجود جميع البيانات الأساسية (منع أي حقل ناقص)
    if (
      !payload.merchantOrderId ||
      !payload.paymentStatus ||
      !payload.amount ||
      !payload.currency ||
      !payload.orderId
    ) {
      console.error('Kashier webhook: missing required fields', {
        hasOrderId: !!payload.merchantOrderId,
        hasStatus: !!payload.paymentStatus,
        hasAmount: !!payload.amount,
        hasCurrency: !!payload.currency,
        hasKashierOrderId: !!payload.orderId,
      })
      return apiError('بيانات الـ webhook ناقصة', 400, 'MISSING_FIELDS')
    }

    // 1.1 التحقق من صلاحية حالة الدفع المستلمة
    const kashierStatus = payload.paymentStatus.toUpperCase()
    if (!ALLOWED_STATUSES.has(kashierStatus)) {
      console.error('Kashier webhook: unknown payment status rejected', {
        paymentStatus: payload.paymentStatus,
      })
      return apiError('حالة الدفع غير معروفة', 400, 'INVALID_STATUS')
    }

    // 1.2 التحقق من صلاحية العملة المستلمة — لازم تكون جنيه مصري دايماً
    const receivedCurrency = payload.currency.toUpperCase()
    if (receivedCurrency !== ALLOWED_CURRENCY) {
      console.error('Kashier webhook: currency is not EGP', {
        currency: payload.currency,
      })
      return apiError('عملة الدفع يجب أن تكون جنيه مصري (EGP)', 400, 'INVALID_CURRENCY')
    }

    // 1.3 التحقق من أن المبلغ رقم موجب صالح (منع تلاعب بالقيمة)
    const receivedAmount = parseFloat(payload.amount)
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      console.error('Kashier webhook: invalid amount', {
        amount: payload.amount,
      })
      return apiError('المبلغ المستلم غير صالح', 400, 'INVALID_AMOUNT')
    }

    // 2. التحقق من التوقيع (HMAC-SHA256)
    if (!payload.signature || !verifyKashierSignature(payload)) {
      console.error('Kashier webhook: invalid signature', {
        merchantOrderId: payload.merchantOrderId,
        receivedSignature: payload.signature?.slice(0, 10) + '...',
      })
      return apiError('توقيع الـ webhook غير صالح', 401, 'INVALID_SIGNATURE')
    }

    // 3. جلب الطلب بواسطة رقم الطلب (merchantOrderId = orderNumber)
    const order = await db
      .select({
        id: storeOrders.id,
        storeId: storeOrders.storeId,
        orderNumber: storeOrders.orderNumber,
        paymentStatus: storeOrders.paymentStatus,
        paymentMethod: storeOrders.paymentMethod,
        total: storeOrders.total,
        kashierOrderId: storeOrders.kashierOrderId,
      })
      .from(storeOrders)
      .where(eq(storeOrders.orderNumber, payload.merchantOrderId))
      .limit(1)

    if (!order[0]) {
      console.error('Kashier webhook: order not found', {
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('الطلب غير موجود', 404, 'ORDER_NOT_FOUND')
    }

    const orderData = order[0]

    // 3.1 التحقق أن الطلب فعلاً طريقة دفعه kashier (منع تلاعب)
    if (orderData.paymentMethod !== 'kashier') {
      console.error('Kashier webhook: order payment method is not kashier', {
        orderId: orderData.id,
        paymentMethod: orderData.paymentMethod,
      })
      return apiError('طريقة دفع الطلب ليست Kashier', 422, 'PAYMENT_METHOD_MISMATCH')
    }

    // 4. التحقق من تطابق المبلغ (حماية ضد تغيير سعر الدفع)
    const expectedAmount = parseFloat(orderData.total)
    if (
      !Number.isFinite(expectedAmount) ||
      Math.abs(receivedAmount - expectedAmount) > 0.01
    ) {
      console.error('Kashier webhook: amount mismatch', {
        orderId: orderData.id,
        expected: orderData.total,
        received: payload.amount,
        diff: Math.abs(receivedAmount - expectedAmount),
      })
      return apiError('المبلغ المستلم لا يطابق مبلغ الطلب', 422, 'AMOUNT_MISMATCH')
    }

    // 5. التحقق من تطابق العملة مع عملة المتجر (ثغرة العملة)
    const store = await db
      .select({ settings: stores.settings })
      .from(stores)
      .where(eq(stores.id, orderData.storeId))
      .limit(1)

    if (!store[0]) {
      console.error('Kashier webhook: store not found for order', {
        orderId: orderData.id,
        storeId: orderData.storeId,
      })
      return apiError('المتجر غير موجود', 404, 'STORE_NOT_FOUND')
    }

    const storeCurrency = (store[0].settings.currency ?? 'EGP').toUpperCase()
    if (storeCurrency !== ALLOWED_CURRENCY || receivedCurrency !== storeCurrency) {
      console.error('Kashier webhook: currency mismatch', {
        orderId: orderData.id,
        storeCurrency,
        received: receivedCurrency,
        expected: ALLOWED_CURRENCY,
      })
      return apiError('عملة الدفع لا تطابق عملة المتجر (EGP)', 422, 'CURRENCY_MISMATCH')
    }

    // 6. تجنب المعالجة المكررة
    if (orderData.paymentStatus === 'paid') {
      console.log('Kashier webhook: order already paid — skipping', { orderId: orderData.id })
      return apiSuccess({ message: 'تمت المعالجة مسبقاً' })
    }

    // 7. تحديث حالة الدفع حسب نتيجة Kashier
    if (kashierStatus === 'SUCCESS') {
      await db
        .update(storeOrders)
        .set({
          paymentStatus: 'paid',
          kashierPaymentId: payload.transactionId ?? payload.orderId,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(storeOrders.id, orderData.id))

      console.log('Kashier webhook: payment SUCCESS', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        transactionId: payload.transactionId,
        amount: payload.amount,
        currency: receivedCurrency,
      })
    } else if (kashierStatus === 'FAILED' || kashierStatus === 'FAILURE') {
      await db
        .update(storeOrders)
        .set({
          paymentStatus: 'failed',
          kashierPaymentId: payload.transactionId ?? payload.orderId,
          updatedAt: new Date(),
        })
        .where(eq(storeOrders.id, orderData.id))

      console.warn('Kashier webhook: payment FAILED', {
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        amount: payload.amount,
        currency: receivedCurrency,
      })
    } else if (kashierStatus === 'PENDING') {
      // لا تغيير — الطلب لا يزال بانتظار الدفع
      console.log('Kashier webhook: payment still PENDING', {
        orderId: orderData.id,
      })
    }

    // 8. إرجاع 200 لـ Kashier لتأكيد الاستلام
    return apiSuccess({ message: 'تم معالجة الـ webhook بنجاح' })
  } catch (error) {
    console.error('Kashier webhook error:', error)
    return apiError('حدث خطأ داخلي في الخادم', 500, 'INTERNAL_ERROR')
  }
}
