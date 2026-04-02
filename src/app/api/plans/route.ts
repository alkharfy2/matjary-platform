export const maxDuration = 30
import { apiSuccess, handleApiError } from '@/lib/api/response'
import { getPublicPlatformPlans } from '@/lib/queries/platform-plans'

/**
 * GET /api/plans - قائمة الخطط العامة بدون تسجيل دخول.
 */
export async function GET() {
  try {
    const plans = await getPublicPlatformPlans()
    return apiSuccess(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return handleApiError(error)
  }
}
