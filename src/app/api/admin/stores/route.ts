export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores, merchants } from '@/db/schema'
import { desc, count, ilike, eq, and } from 'drizzle-orm'
import { isSuperAdmin } from '@/lib/api/auth'
import { escapeLike } from '@/lib/utils'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const adminStoresQuerySchema = z.object({
  search: z.string().max(100).default(''),
  status: z.enum(['', 'active', 'inactive']).default(''),
  plan: z.string().max(50).default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

/**
 * GET /api/admin/stores — قائمة كل المتاجر (Super Admin فقط)
 * Query: ?search=&status=active|inactive&plan=&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const { searchParams } = request.nextUrl
    const parsed = adminStoresQuerySchema.safeParse({
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? '',
      plan: searchParams.get('plan') ?? '',
      page: searchParams.get('page') ?? '1',
      limit: searchParams.get('limit') ?? '20',
    })

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'معاملات غير صالحة')
    }

    const { search, status, plan, page, limit } = parsed.data
    const offset = (page - 1) * limit

    const conditions = []

    if (search) {
      conditions.push(ilike(stores.name, `%${escapeLike(search)}%`))
    }

    if (status === 'active') conditions.push(eq(stores.isActive, true))
    if (status === 'inactive') conditions.push(eq(stores.isActive, false))
    if (plan) conditions.push(eq(stores.plan, plan))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const totalResult = await db
      .select({ count: count() })
      .from(stores)
      .where(whereClause)

    const total = totalResult[0]?.count ?? 0

    const storeList = await db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        plan: stores.plan,
        isActive: stores.isActive,
        contactEmail: stores.contactEmail,
        createdAt: stores.createdAt,
        merchantName: merchants.displayName,
        merchantEmail: merchants.email,
      })
      .from(stores)
      .innerJoin(merchants, eq(stores.merchantId, merchants.id))
      .where(whereClause)
      .orderBy(desc(stores.createdAt))
      .limit(limit)
      .offset(offset)

    return apiSuccess({
      stores: storeList,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching admin stores:', error)
    return handleApiError(error)
  }
}

