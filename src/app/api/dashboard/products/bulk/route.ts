import 'server-only'
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError, apiError } from '@/lib/api/response'
import { z } from 'zod'

const bulkUpdateSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'change_category', 'delete']),
  ids: z.array(z.string().uuid()).min(1, 'يجب تحديد منتج واحد على الأقل').max(100, 'الحد الأقصى 100 منتج'),
  categoryId: z.string().uuid().optional(),
})

/**
 * PATCH /api/dashboard/products/bulk — تعديل عدة منتجات
 */
export async function PATCH(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = bulkUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { action, ids, categoryId } = parsed.data

    // تحقق أن المنتجات تابعة للمتجر
    const existing = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, ids)))

    const existingIds = existing.map(p => p.id)
    if (existingIds.length === 0) {
      return apiError('لم يتم العثور على منتجات مطابقة', 404)
    }

    let updated = 0

    switch (action) {
      case 'activate':
        await db
          .update(storeProducts)
          .set({ isActive: true, updatedAt: new Date() })
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break

      case 'deactivate':
        await db
          .update(storeProducts)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break

      case 'change_category':
        if (!categoryId) return ApiErrors.validation('التصنيف مطلوب')
        await db
          .update(storeProducts)
          .set({ categoryId, updatedAt: new Date() })
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break

      case 'delete':
        await db
          .delete(storeProducts)
          .where(and(eq(storeProducts.storeId, store.id), inArray(storeProducts.id, existingIds)))
        updated = existingIds.length
        break
    }

    return apiSuccess({ data: { updated, failed: ids.length - existingIds.length } })
  } catch (error) {
    return handleApiError(error)
  }
}
