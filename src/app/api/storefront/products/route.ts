import 'server-only'
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeProducts, storeReviews } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, handleApiError } from '@/lib/api/response'

/**
 * GET /api/storefront/products?ids=uuid1,uuid2,uuid3
 * جلب منتجات بـ IDs — يُستخدم في صفحة المقارنة وشاهدته مؤخراً
 */
export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return new Response('المتجر غير موجود', { status: 404 })

    const idsParam = request.nextUrl.searchParams.get('ids')
    if (!idsParam) return apiSuccess([])

    const ids = idsParam.split(',').filter(Boolean).slice(0, 10) // max 10
    if (ids.length === 0) return apiSuccess([])

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validIds = ids.filter(id => uuidRegex.test(id))
    if (validIds.length === 0) return apiSuccess([])

    const products = await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        price: storeProducts.price,
        compareAtPrice: storeProducts.compareAtPrice,
        images: storeProducts.images,
        shortDescription: storeProducts.shortDescription,
        stock: storeProducts.stock,
        isFeatured: storeProducts.isFeatured,
        variants: storeProducts.variants,
      })
      .from(storeProducts)
      .where(
        and(
          eq(storeProducts.storeId, store.id),
          eq(storeProducts.isActive, true),
          inArray(storeProducts.id, validIds),
        )
      )

    // جلب التقييمات
    const ratingsResult = await db
      .select({
        productId: storeReviews.productId,
        avgRating: sql<number>`avg(${storeReviews.rating})`.as('avg_rating'),
        totalReviews: sql<number>`count(*)::int`.as('total_reviews'),
      })
      .from(storeReviews)
      .where(
        and(
          eq(storeReviews.storeId, store.id),
          eq(storeReviews.isApproved, true),
          inArray(storeReviews.productId, validIds),
        )
      )
      .groupBy(storeReviews.productId)

    const ratingsMap = new Map(ratingsResult.map(r => [r.productId, { avgRating: Number(r.avgRating), totalReviews: r.totalReviews }]))

    const enriched = products.map(p => ({
      ...p,
      avgRating: ratingsMap.get(p.id)?.avgRating ?? null,
      totalReviews: ratingsMap.get(p.id)?.totalReviews ?? 0,
    }))

    return apiSuccess(enriched)
  } catch (error) {
    return handleApiError(error)
  }
}
