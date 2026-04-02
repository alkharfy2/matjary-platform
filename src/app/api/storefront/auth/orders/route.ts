import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'

export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const orders = await db.query.storeOrders.findMany({
      where: and(
        eq(storeOrders.storeId, storeId),
        eq(storeOrders.customerPhone, account.phone)
      ),
      with: {
        items: true,
      },
      orderBy: [desc(storeOrders.createdAt)],
      limit: 50,
    })

    return apiSuccess({ orders })
  } catch (error) {
    return handleApiError(error)
  }
}
