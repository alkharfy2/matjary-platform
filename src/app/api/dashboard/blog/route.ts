export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const blogPostSchema = z.object({
  title: z.string().min(1, { error: 'العنوان مطلوب' }).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, { error: 'الرابط يحتوي على أحرف صغيرة وأرقام وشرطات فقط' }),
  content: z.string().default(''),
  featuredImage: z.string().url({ error: 'رابط الصورة غير صالح' }).optional().nullable(),
  excerpt: z.string().max(500).optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(160).optional().nullable(),
})

/**
 * GET /api/dashboard/blog — قائمة المقالات
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const posts = await db
      .select()
      .from(storeBlogPosts)
      .where(eq(storeBlogPosts.storeId, store.id))
      .orderBy(desc(storeBlogPosts.createdAt))

    return apiSuccess(posts)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/blog — إنشاء مقالة
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = blogPostSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    const [post] = await db
      .insert(storeBlogPosts)
      .values({
        storeId: store.id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        featuredImage: data.featuredImage ?? null,
        excerpt: data.excerpt ?? null,
        author: data.author ?? null,
        isPublished: data.isPublished,
        publishedAt: data.isPublished ? new Date() : null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      })
      .returning()

    return apiSuccess(post, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
