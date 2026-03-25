import { unstable_cache } from 'next/cache'
import { isSuperAdmin } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { getAdminAnalyticsData } from '@/lib/queries/admin-analytics'

/**
 * جلب إحصائيات المنصة مع كاش لمدة 60 ثانية.
 * unstable_cache هي الطريقة الصحيحة لتكاش البيانات في Route Handlers
 * التي تستخدم auth() أو headers() — لأن revalidate يُتجاهل في Dynamic Routes.
 */
const getAnalyticsData = unstable_cache(
  async () => getAdminAnalyticsData(),
  ['admin-analytics'],       // cache key
  { revalidate: 60 },        // تحديث كل 60 ثانية
)

/**
 * GET /api/admin/analytics — إحصائيات المنصة الكاملة (Super Admin)
 */
export async function GET() {
  try {
    const isAdmin = await isSuperAdmin()
    if (!isAdmin) return ApiErrors.forbidden()

    const data = await getAnalyticsData()
    return apiSuccess(data)
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return handleApiError(error)
  }
}

