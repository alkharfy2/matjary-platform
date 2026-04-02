import { NextRequest } from 'next/server'
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { sendConversionEvent } from '@/lib/tracking/facebook-capi'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const trackSchema = z.object({
  event: z.enum(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Search']),
  eventId: z.string().optional(),
  contentIds: z.array(z.string()).optional(),
  contentName: z.string().optional(),
  contentCategory: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  numItems: z.number().optional(),
  searchString: z.string().optional(),
  userEmail: z.string().optional(),
  userPhone: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const { facebookPixelId, facebookConversionApiToken, facebookTestEventCode } = store.settings
    if (!facebookPixelId || !facebookConversionApiToken) {
      return apiSuccess({ tracked: false, reason: 'CAPI not configured' })
    }

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`capi:${ip}`, { maxRequests: 60, windowSeconds: 60 })
    if (!allowed) return apiSuccess({ tracked: false, reason: 'rate_limited' })

    const body = await request.json()
    const data = trackSchema.parse(body)

    const result = await sendConversionEvent(
      {
        pixelId: facebookPixelId,
        accessToken: facebookConversionApiToken,
        testEventCode: facebookTestEventCode,
      },
      data.event,
      {
        email: data.userEmail,
        phone: data.userPhone,
        clientIpAddress: ip,
        clientUserAgent: request.headers.get('user-agent') ?? undefined,
        fbp: data.fbp,
        fbc: data.fbc,
      },
      {
        contentIds: data.contentIds,
        contentName: data.contentName,
        contentCategory: data.contentCategory,
        value: data.value,
        currency: data.currency ?? store.settings.currency,
        numItems: data.numItems,
        searchString: data.searchString,
      },
      request.headers.get('referer') ?? `https://${store.slug}.matjary.com`,
      data.eventId,
    )

    return apiSuccess({ tracked: result.success })
  } catch (error) {
    return handleApiError(error)
  }
}
