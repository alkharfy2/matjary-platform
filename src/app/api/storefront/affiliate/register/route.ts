export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAffiliates } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const registerSchema = z.object({
  name: z.string().min(2, { error: 'الاسم مطلوب' }).max(100),
  phone: z.string().min(10, { error: 'رقم الهاتف مطلوب' }).max(15),
  email: z.string().email().optional().nullable(),
})

/**
 * POST /api/storefront/affiliate/register — تسجيل مسوق جديد
 */
export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const settings = (store.settings ?? {}) as Record<string, unknown>
    if (!settings.affiliateEnabled) {
      return ApiErrors.validation('برنامج الأفلييت غير مفعل')
    }

    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if phone already registered
    const [existing] = await db
      .select({ id: storeAffiliates.id, code: storeAffiliates.code })
      .from(storeAffiliates)
      .where(and(
        eq(storeAffiliates.storeId, store.id),
        eq(storeAffiliates.phone, data.phone),
      ))
      .limit(1)

    if (existing) {
      return apiSuccess({
        code: existing.code,
        link: `${store.slug}.matjary.com/?ref=${existing.code}`,
        message: 'أنت مسجل بالفعل كمسوق',
      })
    }

    // Generate unique code
    const nameSlug = data.name
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 15)
    const code = `${nameSlug || 'aff'}_${nanoid(5)}`

    const defaultRate = (settings.affiliateDefaultCommission as number) || 10

    const [affiliate] = await db
      .insert(storeAffiliates)
      .values({
        storeId: store.id,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        code,
        commissionRate: String(defaultRate),
        isActive: true,
      })
      .returning()

    if (!affiliate) throw new Error('Failed to create affiliate')

    return apiSuccess({
      code: affiliate.code,
      link: `${store.slug}.matjary.com/?ref=${affiliate.code}`,
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
