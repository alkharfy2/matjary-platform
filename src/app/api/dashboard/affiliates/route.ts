export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAffiliates } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const affiliateSchema = z.object({
  name: z.string().min(2, { error: 'الاسم مطلوب (حرفين على الأقل)' }).max(100),
  email: z.string().email({ error: 'إيميل غير صالح' }).optional().nullable(),
  phone: z.string().min(10, { error: 'رقم الهاتف قصير' }).max(15),
  code: z.string().min(3, { error: 'الكود لازم 3 أحرف على الأقل' }).max(30).regex(/^[A-Za-z0-9_-]+$/, { error: 'الكود يحتوي على أحرف وأرقام وشرطات فقط' }),
  commissionRate: z.coerce.number().min(0.01, { error: 'العمولة لازم تكون أكبر من 0' }).max(50, { error: 'العمولة لا تتجاوز 50%' }),
  isActive: z.boolean().default(true),
})

/**
 * GET /api/dashboard/affiliates — قائمة المسوقين
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const affiliates = await db
      .select()
      .from(storeAffiliates)
      .where(eq(storeAffiliates.storeId, store.id))
      .orderBy(desc(storeAffiliates.createdAt))

    return apiSuccess(affiliates)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/affiliates — إنشاء مسوق
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const data = affiliateSchema.parse(body)

    const [affiliate] = await db
      .insert(storeAffiliates)
      .values({
        storeId: store.id,
        ...data,
        commissionRate: String(data.commissionRate),
        email: data.email ?? null,
      })
      .returning()

    return apiSuccess(affiliate, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
