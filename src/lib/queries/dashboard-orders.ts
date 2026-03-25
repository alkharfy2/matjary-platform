import { and, count, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { escapeLike } from '@/lib/utils'

export const dashboardOrderStatuses = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type DashboardOrderStatus = (typeof dashboardOrderStatuses)[number]

export type DashboardOrdersFilters = {
  status: DashboardOrderStatus | 'all'
  search: string
  page: number
  limit: number
}

type RawDashboardOrdersFilters = {
  status?: string
  search?: string
  page?: string
  limit?: string
}

function parseNumberParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function normalizeDashboardOrdersFilters(
  input: RawDashboardOrdersFilters
): DashboardOrdersFilters {
  const status =
    input.status && (dashboardOrderStatuses as readonly string[]).includes(input.status)
      ? (input.status as DashboardOrderStatus)
      : 'all'

  return {
    status,
    search: input.search?.trim() ?? '',
    page: parseNumberParam(input.page, 1, 1, 9999),
    limit: parseNumberParam(input.limit, 20, 1, 50),
  }
}

export async function getDashboardOrders(
  storeId: string,
  filters: DashboardOrdersFilters
) {
  const conditions = [eq(storeOrders.storeId, storeId)]

  if (filters.status !== 'all') {
    conditions.push(eq(storeOrders.orderStatus, filters.status))
  }

  if (filters.search) {
    const search = `%${escapeLike(filters.search)}%`
    conditions.push(
      or(
        ilike(storeOrders.orderNumber, search),
        ilike(storeOrders.customerName, search),
        ilike(storeOrders.customerPhone, search)
      )!
    )
  }

  const totalResult = await db
    .select({ count: count() })
    .from(storeOrders)
    .where(and(...conditions))

  const total = totalResult[0]?.count ?? 0
  const offset = (filters.page - 1) * filters.limit

  const orders = await db
    .select({
      id: storeOrders.id,
      orderNumber: storeOrders.orderNumber,
      customerName: storeOrders.customerName,
      customerPhone: storeOrders.customerPhone,
      total: storeOrders.total,
      paymentStatus: storeOrders.paymentStatus,
      orderStatus: storeOrders.orderStatus,
      createdAt: storeOrders.createdAt,
    })
    .from(storeOrders)
    .where(and(...conditions))
    .orderBy(desc(storeOrders.createdAt))
    .limit(filters.limit)
    .offset(offset)

  return {
    orders,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  }
}

export function getOrderStatusLabel(status: string) {
  if (status === 'pending') return 'قيد الانتظار'
  if (status === 'confirmed') return 'مؤكد'
  if (status === 'processing') return 'قيد التحضير'
  if (status === 'shipped') return 'تم الشحن'
  if (status === 'delivered') return 'تم التسليم'
  if (status === 'cancelled') return 'ملغي'
  if (status === 'refunded') return 'مسترجع'
  return status
}

export function isDashboardOrderStatus(status: string): status is DashboardOrderStatus {
  return (dashboardOrderStatuses as readonly string[]).includes(status)
}

export const orderStatusTransitions: Record<DashboardOrderStatus, DashboardOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}
