export const maxDuration = 30
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { merchants, stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ApiErrors, apiSuccess, handleApiError } from '@/lib/api/response'

/**
 * GET /api/stores/me - current user's store summary
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return ApiErrors.unauthorized()

    const result = await db
      .select({
        id: stores.id,
        slug: stores.slug,
        name: stores.name,
      })
      .from(stores)
      .innerJoin(merchants, eq(stores.merchantId, merchants.id))
      .where(eq(merchants.clerkUserId, userId))
      .limit(1)

    return apiSuccess({ store: result[0] ?? null })
  } catch (error) {
    console.error('Error fetching current user store:', error)
    return handleApiError(error)
  }
}
