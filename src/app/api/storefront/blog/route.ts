export const maxDuration = 30
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

/**
 * GET /api/storefront/blog — المقالات المنشورة (عامة)
 */
export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const posts = await db
      .select({
        id: storeBlogPosts.id,
        title: storeBlogPosts.title,
        slug: storeBlogPosts.slug,
        excerpt: storeBlogPosts.excerpt,
        featuredImage: storeBlogPosts.featuredImage,
        author: storeBlogPosts.author,
        publishedAt: storeBlogPosts.publishedAt,
        seoTitle: storeBlogPosts.seoTitle,
        seoDescription: storeBlogPosts.seoDescription,
      })
      .from(storeBlogPosts)
      .where(and(eq(storeBlogPosts.storeId, store.id), eq(storeBlogPosts.isPublished, true)))
      .orderBy(desc(storeBlogPosts.publishedAt))

    return apiSuccess(posts)
  } catch (error) {
    return handleApiError(error)
  }
}
