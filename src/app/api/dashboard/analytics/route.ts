export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders, storeProducts, storeCustomers, storeOrderItems } from '@/db/schema'
import { eq, and, gte, lte, sql, count, sum, desc } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

const analyticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

/**
 * GET /api/dashboard/analytics — إحصائيات المتجر
 * Query: ?from=2025-01-01&to=2025-12-31
 */
export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { searchParams } = request.nextUrl
    const rawFrom = searchParams.get('from')
    const rawTo = searchParams.get('to')

    const parsed = analyticsQuerySchema.safeParse({
      from: rawFrom ?? undefined,
      to: rawTo ?? undefined,
    })

    if (!parsed.success) {
      return ApiErrors.validation('تاريخ غير صالح — استخدم صيغة YYYY-MM-DD')
    }

    // Default to last 30 days
    const now = new Date()
    const from = parsed.data.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const to = parsed.data.to ?? now

    // Total orders in period
    const ordersResult = await db
      .select({
        count: count(),
        totalRevenue: sum(storeOrders.total),
      })
      .from(storeOrders)
      .where(
        and(
          eq(storeOrders.storeId, store.id),
          gte(storeOrders.createdAt, from),
          lte(storeOrders.createdAt, to),
        )
      )

    // Orders by status
    const ordersByStatus = await db
      .select({
        status: storeOrders.orderStatus,
        count: count(),
      })
      .from(storeOrders)
      .where(
        and(
          eq(storeOrders.storeId, store.id),
          gte(storeOrders.createdAt, from),
          lte(storeOrders.createdAt, to),
        )
      )
      .groupBy(storeOrders.orderStatus)

    // Total products
    const productsCount = await db
      .select({ count: count() })
      .from(storeProducts)
      .where(eq(storeProducts.storeId, store.id))

    // Total customers
    const customersCount = await db
      .select({ count: count() })
      .from(storeCustomers)
      .where(eq(storeCustomers.storeId, store.id))

    // Recent orders (last 5)
    const recentOrders = await db
      .select({
        id: storeOrders.id,
        orderNumber: storeOrders.orderNumber,
        customerName: storeOrders.customerName,
        total: storeOrders.total,
        orderStatus: storeOrders.orderStatus,
        createdAt: storeOrders.createdAt,
      })
      .from(storeOrders)
      .where(eq(storeOrders.storeId, store.id))
      .orderBy(desc(storeOrders.createdAt))
      .limit(5)

    // Top products by actual sales
    const topProducts = await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        price: storeProducts.price,
        stock: storeProducts.stock,
        images: storeProducts.images,
        totalSold: sql<number>`COALESCE(SUM(${storeOrderItems.quantity}), 0)`,
      })
      .from(storeProducts)
      .leftJoin(storeOrderItems, eq(storeOrderItems.productId, storeProducts.id))
      .where(and(eq(storeProducts.storeId, store.id), eq(storeProducts.isActive, true)))
      .groupBy(storeProducts.id, storeProducts.name, storeProducts.price, storeProducts.stock, storeProducts.images)
      .orderBy(sql`COALESCE(SUM(${storeOrderItems.quantity}), 0) DESC`)
      .limit(5)

    // Orders per day (for chart)
    const dailyOrders = await db
      .select({
        date: sql<string>`DATE(${storeOrders.createdAt})`,
        count: count(),
        revenue: sum(storeOrders.total),
      })
      .from(storeOrders)
      .where(
        and(
          eq(storeOrders.storeId, store.id),
          gte(storeOrders.createdAt, from),
          lte(storeOrders.createdAt, to),
        )
      )
      .groupBy(sql`DATE(${storeOrders.createdAt})`)
      .orderBy(sql`DATE(${storeOrders.createdAt})`)

    return apiSuccess({
      summary: {
        totalOrders: ordersResult[0]?.count ?? 0,
        totalRevenue: parseFloat(ordersResult[0]?.totalRevenue ?? '0'),
        totalProducts: productsCount[0]?.count ?? 0,
        totalCustomers: customersCount[0]?.count ?? 0,
      },
      ordersByStatus,
      recentOrders,
      topProducts,
      dailyOrders,
      period: { from: from.toISOString(), to: to.toISOString() },
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return handleApiError(error)
  }
}
