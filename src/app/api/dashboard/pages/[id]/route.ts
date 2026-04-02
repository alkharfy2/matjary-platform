export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storePages } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updatePageSchema } from '@/lib/validations/order'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/dashboard/pages/[id] — تفاصيل صفحة
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const page = await db
      .select()
      .from(storePages)
      .where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))
      .limit(1)

    if (!page[0]) return ApiErrors.notFound('الصفحة')

    return apiSuccess(page[0])
  } catch (error) {
    console.error('Error fetching page:', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/pages/[id] — تعديل صفحة
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storePages.id })
      .from(storePages)
      .where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الصفحة')

    const body = await request.json()
    const parsed = updatePageSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    // Check slug uniqueness if changed
    if (parsed.data.slug) {
      const slugExists = await db
        .select({ id: storePages.id })
        .from(storePages)
        .where(and(eq(storePages.storeId, store.id), eq(storePages.slug, parsed.data.slug)))
        .limit(1)

      if (slugExists[0] && slugExists[0].id !== id) {
        return ApiErrors.validation('هذا الرابط مستخدم بالفعل لصفحة أخرى')
      }
    }

    const updated = await db
      .update(storePages)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating page:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/pages/[id] — حذف صفحة
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storePages.id })
      .from(storePages)
      .where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الصفحة')

    await db.delete(storePages).where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting page:', error)
    return handleApiError(error)
  }
}
