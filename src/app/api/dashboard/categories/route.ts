import { NextRequest } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/db'
import { storeCategories } from '@/db/schema'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { resolveUniqueCategorySlug } from '@/lib/api/dashboard/categories'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { createCategorySchema } from '@/lib/validations/product'

/**
 * GET /api/dashboard/categories - list store categories
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const categories = await db
      .select()
      .from(storeCategories)
      .where(eq(storeCategories.storeId, store.id))
      .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name))

    return apiSuccess(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/categories - create category
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data
    const generatedSlug = await resolveUniqueCategorySlug(store.id, data.name)

    const newCategory = await db
      .insert(storeCategories)
      .values({
        storeId: store.id,
        name: data.name,
        slug: generatedSlug,
        description: data.description,
        imageUrl: data.imageUrl,
        parentId: data.parentId,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      })
      .returning()

    return apiSuccess(newCategory[0], 201)
  } catch (error) {
    console.error('Error creating category:', error)
    return handleApiError(error)
  }
}
