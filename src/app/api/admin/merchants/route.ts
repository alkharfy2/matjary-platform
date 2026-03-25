import { NextRequest } from 'next/server'
import { db } from '@/db'
import { merchants, stores } from '@/db/schema'
import { desc, count, ilike, eq, and } from 'drizzle-orm'
import { isSuperAdmin } from '@/lib/api/auth'
import { escapeLike } from '@/lib/utils'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const adminMerchantsQuerySchema = z.object({
  search: z.string().max(100).default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * GET /api/admin/merchants — قائمة كل التجار (Super Admin فقط)
 * Query: ?search=&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const { searchParams } = request.nextUrl
    const parsed = adminMerchantsQuerySchema.safeParse({
      search: searchParams.get('search') ?? '',
      page: searchParams.get('page') ?? '1',
      limit: searchParams.get('limit') ?? '20',
    })

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'معاملات غير صالحة')
    }

    const { search, page, limit } = parsed.data
    const offset = (page - 1) * limit

    const conditions = []
    if (search) {
      conditions.push(ilike(merchants.email, `%${escapeLike(search)}%`))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const totalResult = await db
      .select({ count: count() })
      .from(merchants)
      .where(whereClause)

    const total = totalResult[0]?.count ?? 0

    const merchantList = await db
      .select({
        id: merchants.id,
        clerkUserId: merchants.clerkUserId,
        email: merchants.email,
        displayName: merchants.displayName,
        phone: merchants.phone,
        isActive: merchants.isActive,
        createdAt: merchants.createdAt,
        storeName: stores.name,
        storeSlug: stores.slug,
        storePlan: stores.plan,
      })
      .from(merchants)
      .leftJoin(stores, eq(merchants.id, stores.merchantId))
      .where(whereClause)
      .orderBy(desc(merchants.createdAt))
      .limit(limit)
      .offset(offset)

    return apiSuccess({
      merchants: merchantList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching merchants:', error)
    return handleApiError(error)
  }
}

