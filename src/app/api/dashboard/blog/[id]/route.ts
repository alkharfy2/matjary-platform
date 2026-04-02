export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const updateBlogPostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  content: z.string().optional(),
  featuredImage: z.string().url().optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  isPublished: z.boolean().optional(),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
})

/**
 * GET /api/dashboard/blog/[id] — مقالة واحدة
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const [post] = await db
      .select()
      .from(storeBlogPosts)
      .where(and(eq(storeBlogPosts.id, id), eq(storeBlogPosts.storeId, store.id)))
      .limit(1)

    if (!post) return ApiErrors.notFound('المقالة')

    return apiSuccess(post)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/blog/[id] — تعديل مقالة
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeBlogPosts.id, isPublished: storeBlogPosts.isPublished, publishedAt: storeBlogPosts.publishedAt })
      .from(storeBlogPosts)
      .where(and(eq(storeBlogPosts.id, id), eq(storeBlogPosts.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('المقالة')

    const body = await request.json()
    const parsed = updateBlogPostSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.content !== undefined) updateData.content = data.content
    if (data.featuredImage !== undefined) updateData.featuredImage = data.featuredImage
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.author !== undefined) updateData.author = data.author
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription

    if (data.isPublished !== undefined) {
      updateData.isPublished = data.isPublished
      if (data.isPublished && !existing[0].publishedAt) {
        updateData.publishedAt = new Date()
      }
    }

    const [updated] = await db
      .update(storeBlogPosts)
      .set(updateData)
      .where(and(eq(storeBlogPosts.id, id), eq(storeBlogPosts.storeId, store.id)))
      .returning()

    return apiSuccess(updated)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/blog/[id] — حذف مقالة
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeBlogPosts.id })
      .from(storeBlogPosts)
      .where(and(eq(storeBlogPosts.id, id), eq(storeBlogPosts.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('المقالة')

    await db.delete(storeBlogPosts).where(and(eq(storeBlogPosts.id, id), eq(storeBlogPosts.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
