export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeShippingAccounts } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  apiKey: z.string().min(1).optional(),
  apiSecret: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
})

/**
 * PUT /api/dashboard/shipping-accounts/[id] — تعديل حساب شحن
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id } = await params

    const body = await request.json()
    const data = updateSchema.parse(body)

    const [existing] = await db
      .select({ id: storeShippingAccounts.id })
      .from(storeShippingAccounts)
      .where(and(eq(storeShippingAccounts.id, id), eq(storeShippingAccounts.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('حساب الشحن')

    const [updated] = await db
      .update(storeShippingAccounts)
      .set(data)
      .where(eq(storeShippingAccounts.id, id))
      .returning({
        id: storeShippingAccounts.id,
        provider: storeShippingAccounts.provider,
        isActive: storeShippingAccounts.isActive,
      })

    return apiSuccess(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/shipping-accounts/[id] — حذف حساب شحن
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id } = await params

    const [existing] = await db
      .select({ id: storeShippingAccounts.id })
      .from(storeShippingAccounts)
      .where(and(eq(storeShippingAccounts.id, id), eq(storeShippingAccounts.storeId, store.id)))
      .limit(1)

    if (!existing) return ApiErrors.notFound('حساب الشحن')

    await db.delete(storeShippingAccounts).where(eq(storeShippingAccounts.id, id))

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
