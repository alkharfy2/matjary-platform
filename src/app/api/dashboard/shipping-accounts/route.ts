export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeShippingAccounts } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const shippingAccountSchema = z.object({
  provider: z.enum(['bosta', 'aramex', 'jnt', 'mylerz'], { error: 'شركة شحن غير مدعومة' }),
  apiKey: z.string().min(1, { error: 'API Key مطلوب' }),
  apiSecret: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  settings: z.record(z.string(), z.unknown()).optional().nullable(),
})

/**
 * GET /api/dashboard/shipping-accounts — قائمة حسابات الشحن
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const accounts = await db
      .select({
        id: storeShippingAccounts.id,
        provider: storeShippingAccounts.provider,
        isActive: storeShippingAccounts.isActive,
        accountId: storeShippingAccounts.accountId,
        createdAt: storeShippingAccounts.createdAt,
      })
      .from(storeShippingAccounts)
      .where(eq(storeShippingAccounts.storeId, store.id))
      .orderBy(desc(storeShippingAccounts.createdAt))

    return apiSuccess(accounts)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/shipping-accounts — إضافة حساب شحن
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const data = shippingAccountSchema.parse(body)

    const [account] = await db
      .insert(storeShippingAccounts)
      .values({
        storeId: store.id,
        provider: data.provider,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret ?? null,
        accountId: data.accountId ?? null,
        isActive: data.isActive,
        settings: data.settings ?? {},
      })
      .returning({
        id: storeShippingAccounts.id,
        provider: storeShippingAccounts.provider,
        isActive: storeShippingAccounts.isActive,
        createdAt: storeShippingAccounts.createdAt,
      })

    return apiSuccess(account, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
