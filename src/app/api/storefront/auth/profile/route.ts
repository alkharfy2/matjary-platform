import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeCustomerAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.email().optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    const body = await request.json()
    const data = updateProfileSchema.parse(body)

    const [updated] = await db.update(storeCustomerAccounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storeCustomerAccounts.id, account.id))
      .returning()

    return apiSuccess({ customer: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
