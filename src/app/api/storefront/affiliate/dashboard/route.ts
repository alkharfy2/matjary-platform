export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAffiliates, storeAffiliateSales, storeOrders } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { eq, and, desc } from 'drizzle-orm'

/**
 * GET /api/storefront/affiliate/dashboard?code=XXX — لوحة تحكم المسوق (عامة)
 */
export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const code = request.nextUrl.searchParams.get('code')
    if (!code) return ApiErrors.validation('كود الإحالة مطلوب')

    const [affiliate] = await db
      .select()
      .from(storeAffiliates)
      .where(and(
        eq(storeAffiliates.storeId, store.id),
        eq(storeAffiliates.code, code),
      ))
      .limit(1)

    if (!affiliate) return ApiErrors.notFound('المسوق')

    const sales = await db
      .select({
        id: storeAffiliateSales.id,
        saleAmount: storeAffiliateSales.saleAmount,
        commissionAmount: storeAffiliateSales.commissionAmount,
        status: storeAffiliateSales.status,
        createdAt: storeAffiliateSales.createdAt,
        orderNumber: storeOrders.orderNumber,
      })
      .from(storeAffiliateSales)
      .leftJoin(storeOrders, eq(storeAffiliateSales.orderId, storeOrders.id))
      .where(and(
        eq(storeAffiliateSales.affiliateId, affiliate.id),
        eq(storeAffiliateSales.storeId, store.id),
      ))
      .orderBy(desc(storeAffiliateSales.createdAt))
      .limit(50)

    return apiSuccess({
      code: affiliate.code,
      name: affiliate.name,
      totalSales: affiliate.totalSales,
      totalCommission: affiliate.totalCommission,
      pendingCommission: affiliate.pendingCommission,
      sales,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
