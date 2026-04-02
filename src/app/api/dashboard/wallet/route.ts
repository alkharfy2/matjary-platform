export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { merchants, stores, platformPlans, merchantWalletTransactions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { verifyStoreOwnership, getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, ApiErrors } from '@/lib/api/response'

/**
 * GET /api/dashboard/wallet
 * بيانات المحفظة: الرصيد + رسوم الطلب + آخر 50 معاملة
 */
export async function GET(_request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    // جلب كل البيانات بالتوازي
    const [merchantRow, planRow, transactions] = await Promise.all([
      db
        .select({ balance: merchants.balance })
        .from(merchants)
        .where(eq(merchants.id, merchant.id))
        .limit(1),

      db
        .select({ orderFee: platformPlans.orderFee })
        .from(platformPlans)
        .where(eq(platformPlans.id, store.plan))
        .limit(1),

      db
        .select({
          id: merchantWalletTransactions.id,
          type: merchantWalletTransactions.type,
          amount: merchantWalletTransactions.amount,
          balanceAfter: merchantWalletTransactions.balanceAfter,
          reference: merchantWalletTransactions.reference,
          notes: merchantWalletTransactions.notes,
          createdAt: merchantWalletTransactions.createdAt,
        })
        .from(merchantWalletTransactions)
        .where(eq(merchantWalletTransactions.merchantId, merchant.id))
        .orderBy(desc(merchantWalletTransactions.createdAt))
        .limit(50),
    ])

    const balance = merchantRow[0]?.balance ?? '0.00'
    const rawFee = planRow[0]?.orderFee ?? null
    const orderFee = rawFee && parseFloat(rawFee) > 0 ? rawFee : null
    const hasOrderFee = orderFee !== null

    return apiSuccess({
      storeId: store.id,
      balance,
      orderFee,
      hasOrderFee,
      transactions: transactions.map((tx) => ({
        ...tx,
        createdAt: tx.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('GET /api/dashboard/wallet error:', error)
    return ApiErrors.internal()
  }
}
