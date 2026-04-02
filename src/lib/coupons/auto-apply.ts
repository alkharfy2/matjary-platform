import { db } from '@/db'
import { storeCoupons } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'

/**
 * يبحث عن كوبونات تلقائية تنطبق على السلة
 */
export async function findAutoApplyCoupons(
  storeId: string,
  subtotal: number,
  customerPhone?: string,
) {
  const now = new Date()

  const coupons = await db
    .select()
    .from(storeCoupons)
    .where(and(
      eq(storeCoupons.storeId, storeId),
      eq(storeCoupons.isActive, true),
      eq(storeCoupons.autoApply, true),
      sql`(${storeCoupons.usageLimit} IS NULL OR ${storeCoupons.usedCount} < ${storeCoupons.usageLimit})`,
      sql`(${storeCoupons.startsAt} IS NULL OR ${storeCoupons.startsAt} <= ${now})`,
      sql`(${storeCoupons.expiresAt} IS NULL OR ${storeCoupons.expiresAt} >= ${now})`,
    ))

  return coupons.filter(c => {
    if (c.minOrderAmount && subtotal < Number(c.minOrderAmount)) return false
    return true
  })
}

/**
 * يختار أفضل كوبون تلقائي (أكبر خصم)
 */
export function selectBestAutoApplyCoupon(
  coupons: Awaited<ReturnType<typeof findAutoApplyCoupons>>,
  subtotal: number,
) {
  if (coupons.length === 0) return null

  let bestCoupon = coupons[0]
  let bestDiscount = 0

  for (const c of coupons) {
    let discount = 0
    if (c.isFreeShipping) {
      continue
    }
    if (c.type === 'percentage') {
      discount = subtotal * (parseFloat(c.value) / 100)
      if (c.maxDiscount) {
        discount = Math.min(discount, parseFloat(c.maxDiscount))
      }
    } else {
      discount = parseFloat(c.value)
    }
    discount = Math.min(discount, subtotal)

    if (discount > bestDiscount) {
      bestDiscount = discount
      bestCoupon = c
    }
  }

  return bestCoupon
}
