import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getCustomerAccount } from '@/lib/auth/customer-middleware'
import { getCurrentStore } from '@/lib/tenant/get-current-store'

export async function GET() {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()
    const storeId = store.id

    const account = await getCustomerAccount(storeId)
    if (!account) return ApiErrors.unauthorized()

    return apiSuccess({ customer: account })
  } catch (error) {
    return handleApiError(error)
  }
}
