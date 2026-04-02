export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeShippingZones } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { createShippingZoneSchema } from '@/lib/validations/order'

/**
 * GET /api/dashboard/shipping — قائمة مناطق الشحن
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const zones = await db
      .select()
      .from(storeShippingZones)
      .where(eq(storeShippingZones.storeId, store.id))
      .orderBy(asc(storeShippingZones.sortOrder))

    return apiSuccess(zones)
  } catch (error) {
    console.error('Error fetching shipping zones:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/shipping — إنشاء منطقة شحن
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const parsed = createShippingZoneSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const data = parsed.data

    const newZone = await db
      .insert(storeShippingZones)
      .values({
        storeId: store.id,
        name: data.name,
        governorates: data.governorates,
        shippingFee: String(data.shippingFee),
        freeShippingMinimum:
          data.freeShippingMinimum === null || data.freeShippingMinimum === undefined
            ? null
            : String(data.freeShippingMinimum),
        estimatedDays: data.estimatedDays,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      })
      .returning()

    return apiSuccess(newZone[0], 201)
  } catch (error) {
    console.error('Error creating shipping zone:', error)
    return handleApiError(error)
  }
}
