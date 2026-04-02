export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerBlocks } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/dashboard/customers/[id]/block — التحقق من حالة الحظر
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const decodedPhone = decodeURIComponent(id)

    const [block] = await db
      .select()
      .from(storeCustomerBlocks)
      .where(and(
        eq(storeCustomerBlocks.storeId, store.id),
        eq(storeCustomerBlocks.customerPhone, decodedPhone),
      ))
      .limit(1)

    return apiSuccess({ isBlocked: !!block, block: block ?? null })
  } catch (error) {
    console.error('Error checking customer block:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/customers/[id]/block — حظر عميل على مستوى المتجر
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const decodedPhone = decodeURIComponent(id)

    const body = await request.json()
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null

    const [existing] = await db
      .select({ id: storeCustomerBlocks.id })
      .from(storeCustomerBlocks)
      .where(and(
        eq(storeCustomerBlocks.storeId, store.id),
        eq(storeCustomerBlocks.customerPhone, decodedPhone),
      ))
      .limit(1)

    if (existing) {
      return apiSuccess({ message: 'العميل محظور بالفعل' })
    }

    const block = await db
      .insert(storeCustomerBlocks)
      .values({
        storeId: store.id,
        customerPhone: decodedPhone,
        reason,
      })
      .returning()

    return apiSuccess(block[0], 201)
  } catch (error) {
    console.error('Error blocking customer:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/customers/[id]/block — رفع حظر عميل
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const decodedPhone = decodeURIComponent(id)

    await db
      .delete(storeCustomerBlocks)
      .where(and(
        eq(storeCustomerBlocks.storeId, store.id),
        eq(storeCustomerBlocks.customerPhone, decodedPhone),
      ))

    return apiSuccess({ message: 'تم رفع الحظر بنجاح' })
  } catch (error) {
    console.error('Error unblocking customer:', error)
    return handleApiError(error)
  }
}
