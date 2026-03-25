import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores, merchants, merchantWalletTransactions } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'
import { walletStatusQuerySchema } from '@/lib/validations/wallet'

/**
 * GET /api/payments/wallet/status?storeId=xxx&paymentStatus=SUCCESS&...
 * Polling endpoint لصفحة wallet-result — يرجع الرصيد الحالي.
 *
 * Fallback لشحن الرصيد عندما لا يصل الـ webhook (localhost / ngrok غير مفعّل).
 * الحماية تعتمد على:
 *   1. المستخدم مصادق عليه (Clerk session) ويملك المتجر
 *   2. merchantOrderId يبدأ بـ wallet_{merchant.id}_ → يثبت أن هذا التاجر هو من أنشأ الجلسة
 *   3. idempotency عبر kashier orderId → منع الشحن المكرر
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    // 2. Zod validation على query param
    const { searchParams } = new URL(request.url)
    const parsed = walletStatusQuerySchema.safeParse({ storeId: searchParams.get('storeId') })
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'معرف المتجر غير صالح')
    }

    // 3. جلب المتجر + تحقق ملكية
    const storeRow = await db
      .select({
        id: stores.id,
        merchantId: stores.merchantId,
        slug: stores.slug,
      })
      .from(stores)
      .where(eq(stores.id, parsed.data.storeId))
      .limit(1)

    if (!storeRow[0]) return ApiErrors.storeNotFound()

    if (storeRow[0].merchantId !== merchant.id) {
      return apiError('ليس لديك صلاحية على هذا المتجر', 403, 'FORBIDDEN')
    }

    // 4. Fallback: شحن الرصيد لو الـ webhook ما وصلش
    const paymentStatus = searchParams.get('paymentStatus')?.toUpperCase()
    const merchantOrderId = searchParams.get('merchantOrderId') ?? ''
    const kashierOrderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (
      paymentStatus === 'SUCCESS' &&
      kashierOrderId &&
      amount
    ) {
      // تحقق أن merchantOrderId = wallet_{merchant.id}_{timestamp}
      // هذا يثبت أن هذا التاجر تحديداً هو من أنشأ هذه الجلسة
      const expectedPrefix = `wallet_${merchant.id}_`
      if (!merchantOrderId.startsWith(expectedPrefix)) {
        console.warn('Wallet status fallback: merchantOrderId mismatch', {
          expected: expectedPrefix,
          received: merchantOrderId,
          merchantId: merchant.id,
        })
        return apiError('طلب الدفع لا ينتمي لهذا الحساب', 403, 'ORDER_MISMATCH')
      }

      const receivedAmount = parseFloat(amount)
      if (!Number.isFinite(receivedAmount) || receivedAmount <= 0 || receivedAmount > 50000) {
        return apiError('مبلغ غير صالح', 400, 'INVALID_AMOUNT')
      }

      // idempotency — تحقق إن ما فيش transaction بنفس kashier orderId
      const existing = await db
        .select({ id: merchantWalletTransactions.id })
        .from(merchantWalletTransactions)
        .where(
          and(
            eq(merchantWalletTransactions.merchantId, merchant.id),
            eq(merchantWalletTransactions.reference, kashierOrderId),
          ),
        )
        .limit(1)

      if (!existing[0]) {
        await db.transaction(async (tx) => {
          const [locked] = await tx
            .select({ balance: merchants.balance })
            .from(merchants)
            .where(eq(merchants.id, merchant.id))
            .for('update')

          const balanceBefore = parseFloat(locked?.balance ?? '0')
          const balanceAfter = +(balanceBefore + receivedAmount).toFixed(2)

          await tx
            .update(merchants)
            .set({ balance: balanceAfter.toFixed(2), updatedAt: new Date() })
            .where(eq(merchants.id, merchant.id))

          await tx.insert(merchantWalletTransactions).values({
            merchantId: merchant.id,
            type: 'top_up',
            amount: receivedAmount.toFixed(2),
            balanceBefore: balanceBefore.toFixed(2),
            balanceAfter: balanceAfter.toFixed(2),
            reference: kashierOrderId,
            notes: 'شحن محفظة عبر Kashier (redirect fallback)',
          })
        })

        console.info('Wallet status: fallback top-up applied', {
          merchantId: merchant.id,
          amount: receivedAmount,
          kashierOrderId,
        })
      }
    }

    // 5. جلب الرصيد الحالي (بعد أي تحديث محتمل)
    const merchantRow = await db
      .select({ balance: merchants.balance })
      .from(merchants)
      .where(eq(merchants.id, merchant.id))
      .limit(1)

    const balance = merchantRow[0]?.balance ?? '0.00'

    return apiSuccess({ balance, slug: storeRow[0].slug }, 200)
  } catch (error) {
    console.error('GET /api/payments/wallet/status error:', error)
    return ApiErrors.internal()
  }
}
