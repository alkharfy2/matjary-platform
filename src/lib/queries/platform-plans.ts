import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { platformPlans } from '@/db/schema'

export type PublicPlatformPlan = {
  id: string
  name: string
  nameEn: string | null
  priceMonthly: string
  priceYearly: string | null
  orderFee: string | null
  maxProducts: number | null
  maxOrdersPerMonth: number | null
  features: string[]
  isMostPopular: boolean
  sortOrder: number
}

export async function getPublicPlatformPlans(): Promise<PublicPlatformPlan[]> {
  return db
    .select({
      id: platformPlans.id,
      name: platformPlans.name,
      nameEn: platformPlans.nameEn,
      priceMonthly: platformPlans.priceMonthly,
      priceYearly: platformPlans.priceYearly,
      orderFee: platformPlans.orderFee,
      maxProducts: platformPlans.maxProducts,
      maxOrdersPerMonth: platformPlans.maxOrdersPerMonth,
      features: platformPlans.features,
      isMostPopular: platformPlans.isMostPopular,
      sortOrder: platformPlans.sortOrder,
    })
    .from(platformPlans)
    .where(eq(platformPlans.isActive, true))
    .orderBy(asc(platformPlans.sortOrder), asc(platformPlans.name))
}
