export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

type Params = { params: Promise<{ slug: string }> }

/**
 * GET /api/storefront/blog/[slug] — مقالة واحدة بالـ slug (عامة)
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const { slug } = await params

    const [post] = await db
      .select()
      .from(storeBlogPosts)
      .where(
        and(
          eq(storeBlogPosts.storeId, store.id),
          eq(storeBlogPosts.slug, slug),
          eq(storeBlogPosts.isPublished, true),
        )
      )
      .limit(1)

    if (!post) return ApiErrors.notFound('المقالة')

    return apiSuccess(post)
  } catch (error) {
    return handleApiError(error)
  }
}
