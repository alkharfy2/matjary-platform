export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifyKashierSignature } from '@/lib/payments/kashier'
import type { KashierWebhookPayload } from '@/lib/payments/kashier'
import { apiSuccess, apiError } from '@/lib/api/response'

/** العملة الوحيدة المدعومة — جنيه مصري */
const ALLOWED_CURRENCY = 'EGP'

/**
 * POST /api/payments/subscription/webhook
 * استقبال إشعار من Kashier بعد دفع اشتراك الخطة
 *
 * يُستدعى من خوادم Kashier — لا يحتاج مصادقة
 * يعتمد على التحقق من التوقيع (HMAC-SHA256)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as KashierWebhookPayload

    // 1. التحقق من وجود البيانات الأساسية
    if (
      !payload.merchantOrderId ||
      !payload.paymentStatus ||
      !payload.amount ||
      !payload.currency ||
      !payload.orderId
    ) {
      console.error('Subscription webhook: missing required fields', {
        hasOrderId: !!payload.merchantOrderId,
        hasStatus: !!payload.paymentStatus,
        hasAmount: !!payload.amount,
        hasCurrency: !!payload.currency,
        hasKashierOrderId: !!payload.orderId,
      })
      return apiError('بيانات الـ webhook ناقصة', 400, 'MISSING_FIELDS')
    }

    // 1.1 التحقق أن merchantOrderId يبدأ بـ sub_ (اشتراك مش طلب)
    if (!payload.merchantOrderId.startsWith('sub_')) {
      console.error('Subscription webhook: not a subscription order', {
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('هذا ليس طلب اشتراك', 400, 'NOT_SUBSCRIPTION')
    }

    // 1.2 التحقق من العملة
    const receivedCurrency = payload.currency.toUpperCase()
    if (receivedCurrency !== ALLOWED_CURRENCY) {
      console.error('Subscription webhook: currency is not EGP', {
        currency: payload.currency,
      })
      return apiError('عملة الدفع يجب أن تكون جنيه مصري (EGP)', 400, 'INVALID_CURRENCY')
    }

    // 1.3 التحقق من أن المبلغ رقم موجب صالح
    const receivedAmount = parseFloat(payload.amount)
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      console.error('Subscription webhook: invalid amount', {
        amount: payload.amount,
      })
      return apiError('المبلغ المستلم غير صالح', 400, 'INVALID_AMOUNT')
    }

    // 2. التحقق من التوقيع (HMAC-SHA256)
    if (!payload.signature || !verifyKashierSignature(payload)) {
      console.error('Subscription webhook: invalid signature', {
        merchantOrderId: payload.merchantOrderId,
        receivedSignature: payload.signature?.slice(0, 10) + '...',
      })
      return apiError('توقيع الـ webhook غير صالح', 401, 'INVALID_SIGNATURE')
    }

    // 3. استخلاص storeId من merchantOrderId: sub_<storeId>_<timestamp>
    const parts = payload.merchantOrderId.split('_')
    // parts[0] = 'sub', parts[1] = storeId (UUID), parts[2] = timestamp
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
    const storeId = parts.slice(1, -1).join('_')

    if (!storeId) {
      console.error('Subscription webhook: cannot extract storeId', {
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('لا يمكن استخلاص معرف المتجر', 400, 'INVALID_ORDER_ID')
    }

    // 4. جلب المتجر + subscriptionAmount
    const storeRow = await db
      .select({
        id: stores.id,
        isPaid: stores.isPaid,
        subscriptionAmount: stores.subscriptionAmount,
        slug: stores.slug,
      })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1)

    if (!storeRow[0]) {
      console.error('Subscription webhook: store not found', {
        storeId,
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('المتجر غير موجود', 404, 'STORE_NOT_FOUND')
    }

    // 5. Idempotency: لو مدفوع بالفعل → تجاهل
    if (storeRow[0].isPaid) {
      console.info('Subscription webhook: store already paid, ignoring', {
        storeId,
        merchantOrderId: payload.merchantOrderId,
      })
      return apiSuccess({ message: 'المتجر مُفعّل بالفعل' }, 200)
    }

    // 6. التحقق من تطابق المبلغ
    const expectedAmount = storeRow[0].subscriptionAmount
      ? parseFloat(storeRow[0].subscriptionAmount)
      : null

    if (
      expectedAmount !== null &&
      Number.isFinite(expectedAmount) &&
      Math.abs(receivedAmount - expectedAmount) > 0.01
    ) {
      console.error('Subscription webhook: amount mismatch', {
        storeId,
        expected: expectedAmount,
        received: receivedAmount,
      })
      return apiError('المبلغ المدفوع لا يتطابق مع المبلغ المتوقع', 422, 'AMOUNT_MISMATCH')
    }

    // 7. معالجة حسب حالة الدفع
    const kashierStatus = payload.paymentStatus.toUpperCase()

    if (kashierStatus === 'SUCCESS') {
      await db
        .update(stores)
        .set({
          isPaid: true,
          subscriptionPaidAt: new Date(),
          subscriptionTransactionId: payload.transactionId ?? payload.orderId,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, storeId))

      console.info('Subscription webhook: store activated after payment', {
        storeId,
        slug: storeRow[0].slug,
        transactionId: payload.transactionId ?? payload.orderId,
        amount: receivedAmount,
      })
    } else {
      // FAILED / FAILURE / PENDING — لا تغيير
      console.warn('Subscription webhook: payment not successful', {
        storeId,
        status: kashierStatus,
        merchantOrderId: payload.merchantOrderId,
      })
    }

    // 8. إرجاع 200 لـ Kashier دايماً
    return apiSuccess({ received: true }, 200)
  } catch (error) {
    console.error('POST /api/payments/subscription/webhook error:', error)
    // نرجع 200 حتى لو فيه خطأ داخلي — عشان Kashier ما يفضلش يعيد المحاولة
    return apiSuccess({ received: true, error: 'internal' }, 200)
  }
}
