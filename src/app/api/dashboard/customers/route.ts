export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomers } from '@/db/schema'
import { eq, and, desc, count, ilike, or } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { escapeLike } from '@/lib/utils'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/dashboard/customers — قائمة عملاء المتجر
 * Query: ?search=&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    const conditions = [eq(storeCustomers.storeId, store.id)]

    if (search) {
      conditions.push(
        or(
          ilike(storeCustomers.name, `%${escapeLike(search)}%`),
          ilike(storeCustomers.phone, `%${escapeLike(search)}%`),
          ilike(storeCustomers.email, `%${escapeLike(search)}%`),
        )!
      )
    }

    const totalResult = await db
      .select({ count: count() })
      .from(storeCustomers)
      .where(and(...conditions))

    const total = totalResult[0]?.count ?? 0

    const customers = await db
      .select()
      .from(storeCustomers)
      .where(and(...conditions))
      .orderBy(desc(storeCustomers.createdAt))
      .limit(limit)
      .offset(offset)

    return apiSuccess({
      customers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return handleApiError(error)
  }
}
