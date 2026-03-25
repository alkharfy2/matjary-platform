import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores, merchants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthenticatedMerchant } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors } from '@/lib/api/response'
import { createWalletSessionSchema } from '@/lib/validations/wallet'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'
import { createWalletSession } from '@/lib/payments/kashier'

const RATE_LIMIT_WALLET_CREATE = { maxRequests: 10, windowSeconds: 3600 }

/**
 * POST /api/payments/wallet/create
 * إنشاء جلسة Kashier لشحن محفظة التاجر
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = getClientIp(request)
    const rl = rateLimit(`wallet:create:${ip}`, RATE_LIMIT_WALLET_CREATE)
    if (!rl.allowed) {
      return apiError('تم تجاوز الحد الأقصى للطلبات. حاول لاحقاً.', 429, 'RATE_LIMITED')
    }

    // 2. Zod validation
    const body = await request.json()
    const parsed = createWalletSessionSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    // 3. Auth
    const merchant = await getAuthenticatedMerchant()
    if (!merchant) return ApiErrors.unauthorized()

    // 4. جلب المتجر + تحقق ملكية
    const storeRow = await db
      .select({
        id: stores.id,
        merchantId: stores.merchantId,
        slug: stores.slug,
      })
      .from(stores)
      .where(eq(stores.id, parsed.data.storeId))
      .limit(1)

    if (!storeRow[0]) return ApiErrors.storeNotFound()

    if (storeRow[0].merchantId !== merchant.id) {
      return apiError('ليس لديك صلاحية على هذا المتجر', 403, 'FORBIDDEN')
    }

    // 5. جلب بريد التاجر (مطلوب لـ Kashier)
    const merchantRow = await db
      .select({ email: merchants.email })
      .from(merchants)
      .where(eq(merchants.id, merchant.id))
      .limit(1)

    const merchantEmail = merchantRow[0]?.email ?? `merchant_${merchant.id}@wallet.local`

    // 6. إنشاء جلسة Kashier
    const amountStr = parsed.data.amount.toFixed(2)
    const { redirectUrl } = await createWalletSession({
      merchantId: merchant.id,
      storeId: storeRow[0].id,
      storeSlug: storeRow[0].slug,
      amount: amountStr,
      currency: 'EGP',
      merchantEmail,
    })

    return apiSuccess({ paymentUrl: redirectUrl }, 200)
  } catch (error) {
    console.error('POST /api/payments/wallet/create error:', error)
    return ApiErrors.internal()
  }
}
