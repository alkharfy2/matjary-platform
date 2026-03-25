import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomers, storeOrders } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateCustomerSchema } from '@/lib/validations/customer'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/dashboard/customers/[id] — تفاصيل عميل مع طلباته
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const customer = await db
      .select()
      .from(storeCustomers)
      .where(and(eq(storeCustomers.id, id), eq(storeCustomers.storeId, store.id)))
      .limit(1)

    if (!customer[0]) return ApiErrors.notFound('العميل')

    // Fetch customer orders
    const orders = await db
      .select()
      .from(storeOrders)
      .where(and(eq(storeOrders.customerId, id), eq(storeOrders.storeId, store.id)))
      .orderBy(desc(storeOrders.createdAt))
      .limit(50)

    return apiSuccess({
      ...customer[0],
      orders,
    })
  } catch (error) {
    console.error('Error fetching customer:', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/customers/[id] — تحديث ملاحظات العميل / حظره
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeCustomers.id })
      .from(storeCustomers)
      .where(and(eq(storeCustomers.id, id), eq(storeCustomers.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('العميل')

    const body = await request.json()
    const parsed = updateCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const updated = await db
      .update(storeCustomers)
      .set(parsed.data)
      .where(and(eq(storeCustomers.id, id), eq(storeCustomers.storeId, store.id)))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating customer:', error)
    return handleApiError(error)
  }
}
