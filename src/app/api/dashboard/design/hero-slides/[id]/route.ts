import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeHeroSlides } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateHeroSlideSchema } from '@/lib/validations/order'
import { deleteImage, extractStoragePathFromUrl } from '@/lib/supabase/storage'

type Params = { params: Promise<{ id: string }> }

/**
 * PUT /api/dashboard/design/hero-slides/[id] — تعديل Hero Slide
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select()
      .from(storeHeroSlides)
      .where(and(eq(storeHeroSlides.id, id), eq(storeHeroSlides.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الشريحة الرئيسية')

    const body = await request.json()
    const parsed = updateHeroSlideSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const updateData: Record<string, unknown> = {}
    const data = parsed.data

    if (data.title !== undefined) updateData.title = data.title
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
    if (data.linkUrl !== undefined) updateData.linkUrl = data.linkUrl
    if (data.buttonText !== undefined) updateData.buttonText = data.buttonText
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (Object.keys(updateData).length === 0) {
      return ApiErrors.validation('لا توجد بيانات للتحديث')
    }

    const oldImageUrl = existing[0].imageUrl
    const nextImageUrl = typeof updateData.imageUrl === 'string' ? updateData.imageUrl : oldImageUrl

    const updated = await db
      .update(storeHeroSlides)
      .set(updateData)
      .where(and(eq(storeHeroSlides.id, id), eq(storeHeroSlides.storeId, store.id)))
      .returning()

    // Best-effort delete when replacing slide image.
    if (
      oldImageUrl &&
      nextImageUrl &&
      oldImageUrl !== nextImageUrl
    ) {
      const oldPath = extractStoragePathFromUrl(oldImageUrl)
      if (oldPath) {
        try {
          await deleteImage(oldPath)
        } catch (error) {
          console.warn('Failed to delete replaced hero image:', error)
        }
      }
    }

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating hero slide:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/design/hero-slides/[id] — حذف Hero Slide
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existing = await db
      .select({ id: storeHeroSlides.id, imageUrl: storeHeroSlides.imageUrl })
      .from(storeHeroSlides)
      .where(and(eq(storeHeroSlides.id, id), eq(storeHeroSlides.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الشريحة الرئيسية')

    await db
      .delete(storeHeroSlides)
      .where(and(eq(storeHeroSlides.id, id), eq(storeHeroSlides.storeId, store.id)))

    await db.delete(storeHeroSlides).where(and(eq(storeHeroSlides.id, id), eq(storeHeroSlides.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error deleting hero slide:', error)
    return handleApiError(error)
  }
}
