export const maxDuration = 30
import { NextRequest } from 'next/server'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { storeShippingZones } from '@/db/schema'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'

const shippingGovernoratesQuerySchema = z.object({
  storeId: z.string().uuid('معرف المتجر غير صالح'),
})

/**
 * GET /api/shipping/governorates?storeId=...
 * يعيد المحافظات المتاحة للشحن (من المناطق النشطة فقط)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = shippingGovernoratesQuerySchema.safeParse({
      storeId: searchParams.get('storeId'),
    })

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const zones = await db
      .select({
        governorates: storeShippingZones.governorates,
      })
      .from(storeShippingZones)
      .where(
        and(
          eq(storeShippingZones.storeId, parsed.data.storeId),
          eq(storeShippingZones.isActive, true)
        )
      )
      .orderBy(asc(storeShippingZones.sortOrder))

    const uniqueGovernorates: string[] = []
    const seen = new Set<string>()

    for (const zone of zones) {
      for (const governorate of zone.governorates) {
        const trimmed = governorate.trim()
        if (!trimmed || seen.has(trimmed)) continue
        seen.add(trimmed)
        uniqueGovernorates.push(trimmed)
      }
    }

    return apiSuccess({ governorates: uniqueGovernorates })
  } catch (error) {
    console.error('Error fetching shipping governorates:', error)
    return handleApiError(error)
  }
}

