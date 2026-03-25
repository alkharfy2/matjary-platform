import { NextRequest } from 'next/server'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { searchStoreProducts } from '@/lib/queries/storefront'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const searchSchema = z.object({
  q: z
    .string()
    .min(2, 'يجب أن يكون البحث حرفين على الأقل')
    .max(100, 'البحث طويل جدًا'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(6),
})

/**
 * GET /api/storefront/search?q=...&limit=...
 * بحث مباشر في منتجات المتجر (Live Search)
 */
export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const params = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = searchSchema.safeParse(params)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'بيانات غير صالحة'
      return ApiErrors.validation(firstError)
    }

    const { q, limit } = parsed.data
    const items = await searchStoreProducts(store.id, q, { limit })

    return apiSuccess({ items, currency: store.settings.currency })
  } catch (error) {
    return handleApiError(error)
  }
}

