import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { verifyOtp } from '@/lib/auth/otp-service'
import { createCustomerSession } from '@/lib/auth/customer-jwt'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'
import { getAdminAuth } from '@/lib/firebase/admin'

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15).regex(/^\+?[0-9]+$/),
  code: z.string().length(6).regex(/^[0-9]+$/).optional(),
  firebaseToken: z.string().min(1).optional(),
  name: z.string().min(2).max(100).optional(),
}).refine(
  (data) => data.code || data.firebaseToken,
  { message: 'Either code or firebaseToken is required' }
)

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`verify:${ip}`, { maxRequests: 10, windowSeconds: 60 })
    if (!allowed) return ApiErrors.tooManyRequests()

    const body = await request.json()
    const { phone, code, firebaseToken, name } = verifyOtpSchema.parse(body)

    // Firebase token verification path
    if (firebaseToken) {
      const adminAuth = getAdminAuth()
      const decodedToken = await adminAuth.verifyIdToken(firebaseToken)

      // Ensure the token's phone matches the request phone
      const tokenPhone = decodedToken.phone_number
      if (!tokenPhone) {
        return apiError('Firebase token does not contain phone number', 400)
      }

      // Normalize phone for comparison (strip +2 prefix)
      const normalizePhone = (p: string) => p.replace(/^\+?2?/, '')
      if (normalizePhone(tokenPhone) !== normalizePhone(phone)) {
        return apiError('Phone number mismatch', 400)
      }
    } else if (code) {
      // Legacy OTP verification path
      const result = await verifyOtp(storeId, phone, code)
      if (!result.success) {
        const messages: Record<string, string> = {
          OTP_EXPIRED_OR_NOT_FOUND: 'الكود غير صحيح أو منتهي الصلاحية',
          OTP_MAX_ATTEMPTS: 'تم تجاوز عدد المحاولات. يرجى طلب كود جديد',
          OTP_INVALID: 'الكود غير صحيح',
        }
        return apiError(messages[result.error!] || result.error!, 400)
      }
    }

    let isNew = false
    let account = await db.query.storeCustomerAccounts.findFirst({
      where: and(
        eq(storeCustomerAccounts.storeId, storeId),
        eq(storeCustomerAccounts.phone, phone)
      ),
    })

    if (!account) {
      isNew = true

      const [newAccount] = await db.insert(storeCustomerAccounts)
        .values({
          storeId,
          phone,
          phoneVerified: true,
          name: name || '',
          authProvider: 'phone',
          lastLoginAt: new Date(),
        })
        .returning()

      account = newAccount!
    } else {
      await db.update(storeCustomerAccounts)
        .set({
          lastLoginAt: new Date(),
          phoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(storeCustomerAccounts.id, account!.id))
    }

    const acct = account!
    await createCustomerSession({
      sub: acct.id,
      storeId: acct.storeId,
      phone: acct.phone,
      name: acct.name,
    })

    return apiSuccess({
      customer: {
        id: acct.id,
        name: acct.name,
        phone: acct.phone,
        email: acct.email,
      },
      isNew,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
