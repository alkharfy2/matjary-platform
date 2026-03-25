import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeShippingZones } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { calculateShippingSchema } from '@/lib/validations/order'

/**
 * POST /api/shipping/calculate — حساب تكلفة الشحن
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = calculateShippingSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { storeId, governorate } = parsed.data

    const zones = await db
      .select()
      .from(storeShippingZones)
      .where(and(eq(storeShippingZones.storeId, storeId), eq(storeShippingZones.isActive, true)))

    const matchingZone = zones.find((zone) =>
      zone.governorates.includes(governorate)
    )

    if (!matchingZone) {
      return apiSuccess({
        cost: 0,
        estimatedDays: null,
        freeShippingMinimum: null,
        supported: false,
        message: 'هذه المحافظة غير مدعومة حالياً',
      })
    }

    return apiSuccess({
      cost: parseFloat(matchingZone.shippingFee),
      estimatedDays: matchingZone.estimatedDays,
      freeShippingMinimum: matchingZone.freeShippingMinimum
        ? parseFloat(matchingZone.freeShippingMinimum)
        : null,
      supported: true,
    })
  } catch (error) {
    console.error('Error calculating shipping:', error)
    return handleApiError(error)
  }
}

