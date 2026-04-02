export const maxDuration = 30
import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { storeCategories } from '@/db/schema'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { resolveUniqueCategorySlug } from '@/lib/api/dashboard/categories'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateCategorySchema } from '@/lib/validations/product'

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/dashboard/categories/[id] - update category
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const existing = await db
      .select({ id: storeCategories.id })
      .from(storeCategories)
      .where(and(eq(storeCategories.id, id), eq(storeCategories.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('التصنيف')

    const body = await request.json()
    const parsed = updateCategorySchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) {
      updateData.name = data.name
      updateData.slug = await resolveUniqueCategorySlug(store.id, data.name, {
        excludeCategoryId: id,
      })
    }

    if (data.description !== undefined) updateData.description = data.description
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
    if (data.parentId !== undefined) updateData.parentId = data.parentId
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (!Object.keys(updateData).length) {
      return ApiErrors.validation('لا توجد بيانات للتحديث')
    }

    const updated = await db
      .update(storeCategories)
      .set(updateData)
      .where(and(eq(storeCategories.id, id), eq(storeCategories.storeId, store.id)))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating category:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/categories/[id] - delete category
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const existing = await db
      .select({ id: storeCategories.id })
      .from(storeCategories)
      .where(and(eq(storeCategories.id, id), eq(storeCategories.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('التصنيف')

    await db.delete(storeCategories).where(and(eq(storeCategories.id, id), eq(storeCategories.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return handleApiError(error)
  }
}
