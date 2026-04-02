export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeHeroSlides } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { createHeroSlideSchema } from '@/lib/validations/order'

/**
 * GET /api/dashboard/design/hero-slides — قائمة Hero Slides
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const slides = await db
      .select()
      .from(storeHeroSlides)
      .where(eq(storeHeroSlides.storeId, store.id))
      .orderBy(asc(storeHeroSlides.sortOrder))

    return apiSuccess(slides)
  } catch (error) {
    console.error('Error fetching hero slides:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/design/hero-slides — إنشاء Hero Slide
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = createHeroSlideSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    const newSlide = await db
      .insert(storeHeroSlides)
      .values({
        storeId: store.id,
        title: data.title,
        subtitle: data.subtitle,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl,
        buttonText: data.buttonText,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      })
      .returning()

    return apiSuccess(newSlide[0], 201)
  } catch (error) {
    console.error('Error creating hero slide:', error)
    return handleApiError(error)
  }
}
