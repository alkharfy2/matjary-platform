import { NextRequest } from 'next/server'
import { db } from '@/db'
import { merchants, merchantWalletTransactions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyKashierSignature } from '@/lib/payments/kashier'
import type { KashierWebhookPayload } from '@/lib/payments/kashier'
import { apiSuccess, apiError } from '@/lib/api/response'

const ALLOWED_CURRENCY = 'EGP'

/**
 * POST /api/payments/wallet/webhook
 * استقبال إشعار Kashier بعد شحن محفظة التاجر
 *
 * لا يحتاج مصادقة — يعتمد على HMAC-SHA256 signature verification
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
      console.error('Wallet webhook: missing required fields', {
        hasOrderId: !!payload.merchantOrderId,
        hasStatus: !!payload.paymentStatus,
        hasAmount: !!payload.amount,
        hasCurrency: !!payload.currency,
        hasKashierOrderId: !!payload.orderId,
      })
      return apiError('بيانات الـ webhook ناقصة', 400, 'MISSING_FIELDS')
    }

    // 2. تحقق أن merchantOrderId يبدأ بـ wallet_
    if (!payload.merchantOrderId.startsWith('wallet_')) {
      console.error('Wallet webhook: not a wallet order', {
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('هذا ليس طلب شحن محفظة', 400, 'NOT_WALLET')
    }

    // 3. التحقق من العملة
    if (payload.currency.toUpperCase() !== ALLOWED_CURRENCY) {
      console.error('Wallet webhook: currency is not EGP', { currency: payload.currency })
      return apiError('عملة الدفع يجب أن تكون جنيه مصري (EGP)', 400, 'INVALID_CURRENCY')
    }

    // 4. التحقق من صحة المبلغ
    const receivedAmount = parseFloat(payload.amount)
    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      console.error('Wallet webhook: invalid amount', { amount: payload.amount })
      return apiError('المبلغ المستلم غير صالح', 400, 'INVALID_AMOUNT')
    }

    // 5. التحقق من التوقيع (HMAC-SHA256)
    if (!payload.signature || !verifyKashierSignature(payload)) {
      console.error('Wallet webhook: invalid signature', {
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('توقيع الـ webhook غير صالح', 401, 'INVALID_SIGNATURE')
    }

    // 6. استخرج merchantId من merchantOrderId: wallet_<merchantId>_<timestamp>
    const parts = payload.merchantOrderId.split('_')
    // parts[0]='wallet', parts[1]=merchantId (UUID بدون -), parts[2..]=timestamp
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx — 36 حرف
    // لكن لو UUID فيه - فهو ممكن يتقسم، نستخدم slice(1, -1).join('_')
    const merchantId = parts.slice(1, -1).join('_')

    if (!merchantId) {
      console.error('Wallet webhook: cannot extract merchantId', {
        merchantOrderId: payload.merchantOrderId,
      })
      return apiError('لا يمكن استخلاص معرف التاجر', 400, 'INVALID_ORDER_ID')
    }

    // 7. Idempotency — تحقق إن ما فيش transaction بنفس الـ kashier orderId
    const existing = await db
      .select({ id: merchantWalletTransactions.id })
      .from(merchantWalletTransactions)
      .where(
        and(
          eq(merchantWalletTransactions.merchantId, merchantId),
          eq(merchantWalletTransactions.reference, payload.orderId),
        ),
      )
      .limit(1)

    if (existing[0]) {
      console.info('Wallet webhook: already processed', { orderId: payload.orderId })
      return apiSuccess({ message: 'تمت المعالجة مسبقاً' }, 200)
    }

    // 8. معالجة حسب الحالة
    if (payload.paymentStatus.toUpperCase() === 'SUCCESS') {
      // 8أ. تحديث الرصيد ذرياً داخل transaction واحدة
      await db.transaction(async (tx) => {
        // SELECT FOR UPDATE — row-level lock لمنع race conditions
        const [merchantRow] = await tx
          .select({ id: merchants.id, balance: merchants.balance })
          .from(merchants)
          .where(eq(merchants.id, merchantId))
          .for('update')

        if (!merchantRow) {
          throw new Error(`التاجر غير موجود: ${merchantId}`)
        }

        const balanceBefore = parseFloat(merchantRow.balance)
        const balanceAfter = +(balanceBefore + receivedAmount).toFixed(2)

        // تحديث الرصيد
        await tx
          .update(merchants)
          .set({
            balance: balanceAfter.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(merchants.id, merchantId))

        // تسجيل المعاملة
        await tx.insert(merchantWalletTransactions).values({
          merchantId,
          type: 'top_up',
          amount: receivedAmount.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          reference: payload.orderId,
          notes: 'شحن محفظة عبر Kashier',
        })
      })

      console.info('Wallet webhook: top-up successful', {
        merchantId,
        amount: receivedAmount,
        orderId: payload.orderId,
      })
    } else {
      console.info('Wallet webhook: payment not successful', {
        merchantId,
        status: payload.paymentStatus,
        orderId: payload.orderId,
      })
    }

    return apiSuccess({ message: 'تم استقبال الـ webhook' }, 200)
  } catch (error) {
    console.error('POST /api/payments/wallet/webhook error:', error)
    // نرجع 200 لـ Kashier حتى لا يعيد المحاولة في حالة أخطاء غير متوقعة
    return apiSuccess({ message: 'تم الاستقبال' }, 200)
  }
}
