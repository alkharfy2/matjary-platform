import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateThemeSchema } from '@/lib/validations/store'

/**
 * GET /api/dashboard/design/theme — بيانات الثيم الحالية
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    return apiSuccess({
      theme: store.theme,
      logoUrl: store.logoUrl,
      faviconUrl: store.faviconUrl,
    })
  } catch (error) {
    console.error('Error fetching theme:', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/design/theme — تحديث ثيم المتجر
 */
export async function PUT(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = updateThemeSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    // Merge with existing theme
    const currentTheme = store.theme
    const newTheme = { ...currentTheme, ...parsed.data }

    const updated = await db
      .update(stores)
      .set({ theme: newTheme, updatedAt: new Date() })
      .where(eq(stores.id, store.id))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating theme:', error)
    return handleApiError(error)
  }
}
