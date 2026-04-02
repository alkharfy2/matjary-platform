import { NextRequest } from 'next/server'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { sendOtp } from '@/lib/auth/otp-service'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+?[0-9]+$/),
})

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`otp:${ip}`, { maxRequests: 5, windowSeconds: 60 })
    if (!allowed) return ApiErrors.tooManyRequests()

    const body = await request.json()
    const { phone } = sendOtpSchema.parse(body)

    const result = await sendOtp(storeId, phone)

    if (!result.success) {
      if (result.error === 'OTP_COOLDOWN') {
        return ApiErrors.tooManyRequests(
          `يرجى الانتظار ${result.cooldownRemaining} ثانية`
        )
      }
      return apiError(result.error!, 400)
    }

    return apiSuccess({ message: 'تم إرسال كود التحقق' })
  } catch (error) {
    return handleApiError(error)
  }
}
