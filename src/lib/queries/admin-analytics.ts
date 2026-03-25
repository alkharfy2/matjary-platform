import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { db } from '@/db'
import {
  merchantWalletTransactions,
  merchants,
  platformActivityLog,
  storeOrders,
  stores,
} from '@/db/schema'
import { escapeLike } from '@/lib/utils'

export type AdminAnalyticsData = {
  summary: {
    totalStores: number
    totalMerchants: number
    totalOrders: number
    activeStores: number
    successfulOrders: number
    subscriptionRevenue: number
    commissionRevenue: number
    subscriptionAndCommissionRevenue: number
  }
  storesByPlan: { plan: string; count: number }[]
  recentStores: {
    id: string
    name: string
    slug: string
    plan: string
    isActive: boolean
    createdAt: Date
    merchantEmail: string
  }[]
  recentActivity: {
    id: string
    action: string
    entity: string
    entityId: string | null
    createdAt: Date
  }[]
}

export type AdminAnalyticsFilters = {
  plan?: string
  search?: string
}

export async function getAdminAnalyticsData(
  filters: AdminAnalyticsFilters = {}
): Promise<AdminAnalyticsData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const normalizedPlan = filters.plan?.trim()
  const normalizedSearch = filters.search?.trim()
  const recentStoresFilters: SQL[] = []

  if (normalizedPlan) {
    recentStoresFilters.push(eq(stores.plan, normalizedPlan))
  }

  if (normalizedSearch) {
    const searchTerm = `%${escapeLike(normalizedSearch)}%`
    const searchCondition = or(
      ilike(stores.name, searchTerm),
      ilike(stores.slug, searchTerm),
      ilike(merchants.email, searchTerm)
    )

    if (searchCondition) {
      recentStoresFilters.push(searchCondition)
    }
  }

  const recentStoresQuery = db
    .select({
      id: stores.id,
      name: stores.name,
      slug: stores.slug,
      plan: stores.plan,
      isActive: stores.isActive,
      createdAt: stores.createdAt,
      merchantEmail: merchants.email,
    })
    .from(stores)
    .innerJoin(merchants, eq(stores.merchantId, merchants.id))

  const recentStoresPromise =
    recentStoresFilters.length > 0 ?
      recentStoresQuery
        .where(and(...recentStoresFilters))
        .orderBy(desc(stores.createdAt))
        .limit(25)
    : recentStoresQuery.orderBy(desc(stores.createdAt)).limit(25)

  const [
    storesCount,
    merchantsCount,
    ordersResult,
    activeStoresResult,
    successfulOrdersResult,
    subscriptionRevenueResult,
    commissionRevenueResult,
    storesByPlan,
    recentStores,
    recentActivity,
  ] = await Promise.all([
    db.select({ count: count() }).from(stores),
    db.select({ count: count() }).from(merchants),
    db.select({ count: count() }).from(storeOrders),
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${storeOrders.storeId})` })
      .from(storeOrders)
      .where(gte(storeOrders.createdAt, thirtyDaysAgo)),
    db
      .select({ count: count() })
      .from(storeOrders)
      .where(eq(storeOrders.orderStatus, 'delivered')),
    db
      .select({
        total: sql<string>`COALESCE(SUM(${stores.subscriptionAmount}::numeric), 0)`,
      })
      .from(stores)
      .where(
        and(isNotNull(stores.subscriptionPaidAt), isNotNull(stores.subscriptionAmount))
      ),
    db
      .select({
        total: sql<string>`COALESCE(SUM(ABS(${merchantWalletTransactions.amount}::numeric)), 0)`,
      })
      .from(merchantWalletTransactions)
      .where(eq(merchantWalletTransactions.type, 'order_fee')),
    db.select({ plan: stores.plan, count: count() }).from(stores).groupBy(stores.plan),
    recentStoresPromise,
    db
      .select({
        id: platformActivityLog.id,
        action: platformActivityLog.action,
        entity: platformActivityLog.entity,
        entityId: platformActivityLog.entityId,
        createdAt: platformActivityLog.createdAt,
      })
      .from(platformActivityLog)
      .orderBy(desc(platformActivityLog.createdAt))
      .limit(20),
  ])

  const subscriptionRevenue = Number.parseFloat(
    subscriptionRevenueResult[0]?.total ?? '0'
  )
  const commissionRevenue = Number.parseFloat(
    commissionRevenueResult[0]?.total ?? '0'
  )

  return {
    summary: {
      totalStores: storesCount[0]?.count ?? 0,
      totalMerchants: merchantsCount[0]?.count ?? 0,
      totalOrders: ordersResult[0]?.count ?? 0,
      activeStores: activeStoresResult[0]?.count ?? 0,
      successfulOrders: successfulOrdersResult[0]?.count ?? 0,
      subscriptionRevenue,
      commissionRevenue,
      subscriptionAndCommissionRevenue: subscriptionRevenue + commissionRevenue,
    },
    storesByPlan,
    recentStores,
    recentActivity,
  }
}
