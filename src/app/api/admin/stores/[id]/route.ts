export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { isSuperAdmin } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateAdminStoreSchema } from '@/lib/validations/store'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/stores/[id] — تفاصيل متجر
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const { id } = await params
    const store = await db.select().from(stores).where(eq(stores.id, id)).limit(1)

    if (!store[0]) return ApiErrors.storeNotFound()

    return apiSuccess(store[0])
  } catch (error) {
    console.error('Error fetching store:', error)
    return handleApiError(error)
  }
}

/**
 * PATCH /api/admin/stores/[id] — تعليق/تفعيل متجر أو تغيير الخطة
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const { id } = await params
    const body = await request.json()

    const parsed = updateAdminStoreSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
    if (parsed.data.isPaid !== undefined) updateData.isPaid = parsed.data.isPaid

    if (parsed.data.plan !== undefined) {
      updateData.plan = parsed.data.plan

      // مزامنة isPaid مع تغيير الخطة (لو ما اتحددش isPaid صريح)
      if (parsed.data.isPaid === undefined) {
        if (parsed.data.plan === 'free') {
          // التحويل لخطة مجانية → تفعيل تلقائي
          updateData.isPaid = true
        } else {
          // التحويل لخطة مدفوعة → جلب الخطة الحالية للتحقق
          const currentStore = await db
            .select({ plan: stores.plan, isPaid: stores.isPaid })
            .from(stores)
            .where(eq(stores.id, id))
            .limit(1)

          if (currentStore[0]?.plan === 'free') {
            // من مجانية لمدفوعة → يحتاج دفع
            updateData.isPaid = false
          }
        }
      }
    }

    const updated = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, id))
      .returning()

    if (!updated[0]) return ApiErrors.storeNotFound()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating store:', error)
    return handleApiError(error)
  }
}
