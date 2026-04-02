import { apiSuccess, handleApiError } from '@/lib/api/response'
import { deleteCustomerSession } from '@/lib/auth/customer-jwt'
import { getCurrentStore } from '@/lib/tenant/get-current-store'

export async function POST() {
  try {
    const store = await getCurrentStore()
    if (store) {
      await deleteCustomerSession(store.id)
    }
    return apiSuccess({ message: 'تم تسجيل الخروج' })
  } catch (error) {
    return handleApiError(error)
  }
}
