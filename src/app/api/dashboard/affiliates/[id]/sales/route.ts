export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAffiliateSales, storeOrders } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, and, desc } from 'drizzle-orm'

/**
 * GET /api/dashboard/affiliates/[id]/sales — مبيعات المسوق
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id: affiliateId } = await params

    const sales = await db
      .select({
        id: storeAffiliateSales.id,
        orderId: storeAffiliateSales.orderId,
        saleAmount: storeAffiliateSales.saleAmount,
        commissionAmount: storeAffiliateSales.commissionAmount,
        status: storeAffiliateSales.status,
        createdAt: storeAffiliateSales.createdAt,
        orderNumber: storeOrders.orderNumber,
      })
      .from(storeAffiliateSales)
      .leftJoin(storeOrders, eq(storeAffiliateSales.orderId, storeOrders.id))
      .where(and(
        eq(storeAffiliateSales.affiliateId, affiliateId),
        eq(storeAffiliateSales.storeId, store.id),
      ))
      .orderBy(desc(storeAffiliateSales.createdAt))

    return apiSuccess(sales)
  } catch (error) {
    return handleApiError(error)
  }
}
