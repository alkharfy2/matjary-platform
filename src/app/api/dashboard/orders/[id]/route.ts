export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import {
  storeOrders,
  storeOrderItems,
  storeCustomers,
  merchants,
  platformPlans,
  merchantWalletTransactions,
  stores,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership, getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, ApiErrors } from '@/lib/api/response'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/dashboard/orders/[id] — تفاصيل طلب
 * يطبّق blur logic: لو الرصيد أقل من رسوم الطلب → يُرجع بيانات محدودة (blurred: true)
 * لو الرصيد كافٍ ولم يُخصم بعد → يخصم ذرياً ثم يُرجع كل البيانات (blurred: false)
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    const { id } = await params

    // جلب الطلب + plan orderFee + رصيد التاجر بالتوازي
    const [orderRows, merchantRow, planRow] = await Promise.all([
      db
        .select()
        .from(storeOrders)
        .where(and(eq(storeOrders.id, id), eq(storeOrders.storeId, store.id)))
        .limit(1),

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
    ])

    if (!orderRows[0]) return ApiErrors.notFound('الطلب')

    const order = orderRows[0]
    const balance = parseFloat(merchantRow[0]?.balance ?? '0')
    const rawFee = planRow[0]?.orderFee ?? null
    const orderFeeNum = rawFee ? parseFloat(rawFee) : 0

    // --- حساب حالة الـ blur ---
    // 1. إذا تم الخصم مسبقاً → مرئي دائماً
    // 2. إذا لا توجد رسوم (free plan أو fee=0) → مرئي دائماً
    // 3. إذا الرصيد >= الرسوم → خصم ذري + مرئي
    // 4. إذا الرصيد < الرسوم → blurred

    let blurred = false

    if (!order.isFeeDeducted && orderFeeNum > 0) {
      if (balance >= orderFeeNum) {
        // خصم ذري — كل العمليات داخل transaction واحدة مع row-level lock
        try {
          await db.transaction(async (tx) => {
            const [lockedMerchant] = await tx
              .select({ id: merchants.id, balance: merchants.balance })
              .from(merchants)
              .where(eq(merchants.id, merchant.id))
              .for('update')

            const currentBalance = parseFloat(lockedMerchant?.balance ?? '0')
            // إعادة التحقق بعد الـ lock (قد تغيّر الرصيد)
            if (currentBalance < orderFeeNum) {
              throw new Error('INSUFFICIENT_BALANCE')
            }

            const balanceAfter = +(currentBalance - orderFeeNum).toFixed(2)

            await tx
              .update(merchants)
              .set({ balance: balanceAfter.toFixed(2), updatedAt: new Date() })
              .where(eq(merchants.id, merchant.id))

            await tx
              .update(storeOrders)
              .set({ isFeeDeducted: true, updatedAt: new Date() })
              .where(and(eq(storeOrders.id, id), eq(storeOrders.storeId, store.id)))

            await tx.insert(merchantWalletTransactions).values({
              merchantId: merchant.id,
              storeId: store.id,
              orderId: id,
              type: 'order_fee',
              amount: (-orderFeeNum).toFixed(2),
              balanceBefore: currentBalance.toFixed(2),
              balanceAfter: balanceAfter.toFixed(2),
              reference: order.orderNumber,
              notes: `رسوم طلب #${order.orderNumber}`,
            })
          })
          // نجح الخصم
          blurred = false
        } catch (txError) {
          // إذا فشل الـ transaction بسبب رصيد غير كافٍ بعد الـ lock → blur
          const msg = txError instanceof Error ? txError.message : ''
          if (msg === 'INSUFFICIENT_BALANCE') {
            blurred = true
          } else {
            // خطأ غير متوقع — نسجله لكن نظهر blur بدل كسر الصفحة
            console.error('orders/[id] fee deduction transaction error:', txError)
            blurred = true
          }
        }
      } else {
        blurred = true
      }
    }

    if (blurred) {
      // إرجاع بيانات محدودة فقط
      return apiSuccess({
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        total: order.total,
        createdAt: order.createdAt,
        blurred: true,
        orderFee: orderFeeNum > 0 ? orderFeeNum.toFixed(2) : null,
        currentBalance: (merchantRow[0]?.balance ?? '0.00'),
      })
    }

    // --- إرجاع كل البيانات ---
    const [items, customerRows] = await Promise.all([
      db
        .select()
        .from(storeOrderItems)
        .where(and(eq(storeOrderItems.orderId, id), eq(storeOrderItems.storeId, store.id))),

      order.customerId
        ? db
            .select()
            .from(storeCustomers)
            .where(
              and(
                eq(storeCustomers.id, order.customerId),
                eq(storeCustomers.storeId, store.id),
              ),
            )
            .limit(1)
        : Promise.resolve([]),
    ])

    return apiSuccess({
      ...order,
      items,
      customer: customerRows[0] ?? null,
      blurred: false,
    })
  } catch (error) {
    console.error('GET /api/dashboard/orders/[id] error:', error)
    return ApiErrors.internal()
  }
}

