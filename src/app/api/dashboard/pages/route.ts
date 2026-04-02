export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storePages } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { createPageSchema } from '@/lib/validations/order'

/**
 * GET /api/dashboard/pages — قائمة الصفحات
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const pages = await db
      .select()
      .from(storePages)
      .where(eq(storePages.storeId, store.id))
      .orderBy(desc(storePages.createdAt))

    return apiSuccess(pages)
  } catch (error) {
    console.error('Error fetching pages:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/pages — إنشاء صفحة
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = createPageSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    // Check slug uniqueness
    const slugExists = await db
      .select({ id: storePages.id })
      .from(storePages)
      .where(and(eq(storePages.storeId, store.id), eq(storePages.slug, data.slug)))
      .limit(1)

    if (slugExists[0]) {
      return ApiErrors.validation('هذا الرابط مستخدم بالفعل لصفحة أخرى')
    }

    const newPage = await db
      .insert(storePages)
      .values({
        storeId: store.id,
        title: data.title,
        slug: data.slug,
        content: data.content,
        pageType: data.pageType,
        isPublished: data.isPublished,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      })
      .returning()

    return apiSuccess(newPage[0], 201)
  } catch (error) {
    console.error('Error creating page:', error)
    return handleApiError(error)
  }
}
