import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  notInArray,
  sql,
  sum,
} from 'drizzle-orm'
import { db } from '@/db'
import {
  storeCustomers,
  storeOrderItems,
  storeOrders,
  storeProducts,
} from '@/db/schema'

export type DashboardAnalyticsDateRange = {
  from?: Date
  to?: Date
}

const EXCLUDED_REVENUE_STATUSES = ['cancelled', 'refunded']

type RecentOrder = {
  id: string
  orderNumber: string
  customerName: string
  total: string
  orderStatus: string
  paymentStatus: string
  createdAt: Date
}

export async function getDashboardAnalyticsData(
  storeId: string,
  range: DashboardAnalyticsDateRange = {}
) {
  const now = new Date()
  const from = range.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const to = range.to ?? now

  const [allTimeOrdersAgg, allTimeRevenueAgg, periodOrdersAgg, periodRevenueAgg, productsCount, customersCount, newCustomersCount] =
    await Promise.all([
      db
        .select({ count: count(), totalRevenue: sum(storeOrders.total) })
        .from(storeOrders)
        .where(eq(storeOrders.storeId, storeId)),
      db
        .select({ count: count(), totalRevenue: sum(storeOrders.total) })
        .from(storeOrders)
        .where(
          and(
            eq(storeOrders.storeId, storeId),
            notInArray(storeOrders.orderStatus, EXCLUDED_REVENUE_STATUSES)
          )
        ),
      db
        .select({ count: count(), totalRevenue: sum(storeOrders.total) })
        .from(storeOrders)
        .where(
          and(
            eq(storeOrders.storeId, storeId),
            gte(storeOrders.createdAt, from),
            lte(storeOrders.createdAt, to)
          )
        ),
      db
        .select({ count: count(), totalRevenue: sum(storeOrders.total) })
        .from(storeOrders)
        .where(
          and(
            eq(storeOrders.storeId, storeId),
            gte(storeOrders.createdAt, from),
            lte(storeOrders.createdAt, to),
            notInArray(storeOrders.orderStatus, EXCLUDED_REVENUE_STATUSES)
          )
        ),
      db.select({ count: count() }).from(storeProducts).where(eq(storeProducts.storeId, storeId)),
      db.select({ count: count() }).from(storeCustomers).where(eq(storeCustomers.storeId, storeId)),
      db
        .select({ count: count() })
        .from(storeCustomers)
        .where(
          and(
            eq(storeCustomers.storeId, storeId),
            gte(storeCustomers.createdAt, from),
            lte(storeCustomers.createdAt, to)
          )
        ),
    ])

  const [ordersByStatus, recentOrders, dailyRevenue, topProducts] = await Promise.all([
    db
      .select({ status: storeOrders.orderStatus, count: count() })
      .from(storeOrders)
      .where(
        and(
          eq(storeOrders.storeId, storeId),
          gte(storeOrders.createdAt, from),
          lte(storeOrders.createdAt, to)
        )
      )
      .groupBy(storeOrders.orderStatus),
    db
      .select({
        id: storeOrders.id,
        orderNumber: storeOrders.orderNumber,
        customerName: storeOrders.customerName,
        total: storeOrders.total,
        orderStatus: storeOrders.orderStatus,
        paymentStatus: storeOrders.paymentStatus,
        createdAt: storeOrders.createdAt,
      })
      .from(storeOrders)
      .where(eq(storeOrders.storeId, storeId))
      .orderBy(desc(storeOrders.createdAt))
      .limit(5),
    db
      .select({
        date: sql<string>`DATE(${storeOrders.createdAt})`,
        orders: count(),
        revenue: sum(storeOrders.total),
      })
      .from(storeOrders)
      .where(
        and(
          eq(storeOrders.storeId, storeId),
          gte(storeOrders.createdAt, from),
          lte(storeOrders.createdAt, to),
          notInArray(storeOrders.orderStatus, EXCLUDED_REVENUE_STATUSES)
        )
      )
      .groupBy(sql`DATE(${storeOrders.createdAt})`)
      .orderBy(sql`DATE(${storeOrders.createdAt})`),
    db
      .select({
        productId: storeOrderItems.productId,
        name: storeOrderItems.name,
        quantitySold: sql<number>`COALESCE(SUM(${storeOrderItems.quantity}), 0)`,
        revenue: sql<string>`COALESCE(SUM(${storeOrderItems.total}), 0)`,
      })
      .from(storeOrderItems)
      .leftJoin(storeOrders, eq(storeOrders.id, storeOrderItems.orderId))
      .where(
        and(
          eq(storeOrderItems.storeId, storeId),
          gte(storeOrders.createdAt, from),
          lte(storeOrders.createdAt, to),
          notInArray(storeOrders.orderStatus, EXCLUDED_REVENUE_STATUSES)
        )
      )
      .groupBy(storeOrderItems.productId, storeOrderItems.name)
      .orderBy(sql`COALESCE(SUM(${storeOrderItems.quantity}), 0) DESC`)
      .limit(5),
  ])

  const allTimeOrders = allTimeOrdersAgg[0]?.count ?? 0
  const allTimeRevenue = Number.parseFloat(allTimeRevenueAgg[0]?.totalRevenue ?? '0')
  const periodOrders = periodOrdersAgg[0]?.count ?? 0
  const periodRevenueOrders = periodRevenueAgg[0]?.count ?? 0
  const periodRevenue = Number.parseFloat(periodRevenueAgg[0]?.totalRevenue ?? '0')

  return {
    summary: {
      totalOrders: allTimeOrders,
      totalRevenue: allTimeRevenue,
      totalProducts: productsCount[0]?.count ?? 0,
      totalCustomers: customersCount[0]?.count ?? 0,
    },
    period: {
      from,
      to,
      totalOrders: periodOrders,
      totalRevenue: periodRevenue,
      averageOrderValue: periodRevenueOrders > 0 ? periodRevenue / periodRevenueOrders : 0,
      newCustomers: newCustomersCount[0]?.count ?? 0,
    },
    ordersByStatus,
    recentOrders: recentOrders as RecentOrder[],
    dailyRevenue: dailyRevenue.map((row) => ({
      date: row.date,
      orders: row.orders,
      revenue: Number.parseFloat(row.revenue ?? '0'),
    })),
    topProducts: topProducts.map((row) => ({
      productId: row.productId,
      name: row.name,
      quantitySold: row.quantitySold ?? 0,
      revenue: Number.parseFloat(row.revenue ?? '0'),
    })),
  }
}
