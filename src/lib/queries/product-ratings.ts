import 'server-only'
import { db } from '@/db'
import { storeReviews } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

/**
 * جلب ملخص التقييم لمنتج أو أكتر
 */
export async function getProductRatings(storeId: string, productIds: string[]): Promise<Map<string, { avgRating: number; totalReviews: number }>> {
  if (productIds.length === 0) return new Map()

  const results = await db
    .select({
      productId: storeReviews.productId,
      avgRating: sql<number>`ROUND(AVG(${storeReviews.rating}), 1)`,
      totalReviews: sql<number>`COUNT(*)`,
    })
    .from(storeReviews)
    .where(
      and(
        eq(storeReviews.storeId, storeId),
        eq(storeReviews.isApproved, true),
        inArray(storeReviews.productId, productIds),
      )
    )
    .groupBy(storeReviews.productId)

  const map = new Map<string, { avgRating: number; totalReviews: number }>()
  for (const row of results) {
    if (row.productId) {
      map.set(row.productId, {
        avgRating: Number(row.avgRating),
        totalReviews: Number(row.totalReviews),
      })
    }
  }
  return map
}
