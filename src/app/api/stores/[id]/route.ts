import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores, merchants } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateStoreSchema, socialLinksSchema } from '@/lib/validations/store'

type Params = { params: Promise<{ id: string }> }

async function getOwnerStore(storeId: string) {
  const { userId } = await auth()
  if (!userId) return null

  const result = await db
    .select()
    .from(stores)
    .innerJoin(merchants, eq(stores.merchantId, merchants.id))
    .where(and(eq(stores.id, storeId), eq(merchants.clerkUserId, userId)))
    .limit(1)

  return result[0]?.stores ?? null
}

/**
 * GET /api/stores/[id] — بيانات المتجر
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const store = await getOwnerStore(id)
    if (!store) return ApiErrors.storeNotFound()

    return apiSuccess(store)
  } catch (error) {
    console.error('Error fetching store:', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/stores/[id] — تعديل بيانات المتجر
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const store = await getOwnerStore(id)
    if (!store) return ApiErrors.storeNotFound()

    const body = await request.json()

    // Validate main fields
    const parsed = updateStoreSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    // Validate social links if provided
    let socialLinks = undefined
    if (body.socialLinks) {
      const socialParsed = socialLinksSchema.safeParse(body.socialLinks)
      if (!socialParsed.success) {
        return ApiErrors.validation('روابط التواصل غير صالحة')
      }
      socialLinks = socialParsed.data
    }

    const updateData: Record<string, unknown> = {
      ...parsed.data,
      updatedAt: new Date(),
    }
    if (socialLinks) updateData.socialLinks = socialLinks

    const updated = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, id))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating store:', error)
    return handleApiError(error)
  }
}
