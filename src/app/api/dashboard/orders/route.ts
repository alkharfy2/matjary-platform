export const maxDuration = 30
import { NextRequest } from 'next/server'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import {
  getDashboardOrders,
  normalizeDashboardOrdersFilters,
} from '@/lib/queries/dashboard-orders'

/**
 * GET /api/dashboard/orders — قائمة طلبات المتجر
 * Query: ?status=&search=&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { searchParams } = request.nextUrl
    const filters = normalizeDashboardOrdersFilters({
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const result = await getDashboardOrders(store.id, filters)
    return apiSuccess(result)
  } catch (error) {
    console.error('GET /api/dashboard/orders error:', error)
    return handleApiError(error)
  }
}
