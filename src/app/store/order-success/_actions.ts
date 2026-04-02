'use server'

import { db } from '@/db'
import { storeUpsellRules, storeProducts, storeOrders, storeOrderItems } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'

type UpsellOfferData = {
  ruleId: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    compareAtPrice: number | null
    images: string[]
  }
  discountType: 'percentage' | 'fixed'
  discountValue: number
  finalPrice: number
} | null

export async function getUpsellOffer(orderId: string): Promise<{ success: boolean; data: UpsellOfferData }> {
  try {
    const store = await getCurrentStore()
    if (!store) return { success: false, data: null }

    const orderItems = await db
      .select({ productId: storeOrderItems.productId })
      .from(storeOrderItems)
      .where(and(eq(storeOrderItems.orderId, orderId), eq(storeOrderItems.storeId, store.id)))

    const productIds = orderItems.map((i) => i.productId).filter(Boolean) as string[]
    if (productIds.length === 0) return { success: true, data: null }

    const rules = await db
      .select()
      .from(storeUpsellRules)
      .where(and(eq(storeUpsellRules.storeId, store.id), eq(storeUpsellRules.isActive, true)))
      .orderBy(storeUpsellRules.sortOrder)

    const matchingRule = rules.find((rule) => {
      if (!rule.triggerProductId) return true
      return productIds.includes(rule.triggerProductId)
    })

    if (!matchingRule) return { success: true, data: null }
    if (productIds.includes(matchingRule.offerProductId)) return { success: true, data: null }

    const [product] = await db
      .select({ id: storeProducts.id, name: storeProducts.name, slug: storeProducts.slug, price: storeProducts.price, compareAtPrice: storeProducts.compareAtPrice, images: storeProducts.images, stock: storeProducts.stock })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, matchingRule.offerProductId), eq(storeProducts.isActive, true)))
      .limit(1)

    if (!product || product.stock <= 0) return { success: true, data: null }

    const price = Number(product.price)
    const discountValue = Number(matchingRule.discountValue)
    const finalPrice = matchingRule.discountType === 'percentage'
      ? Math.round(price * (1 - discountValue / 100) * 100) / 100
      : Math.max(0, price - discountValue)

    return {
      success: true,
      data: {
        ruleId: matchingRule.id,
        product: { id: product.id, name: product.name, slug: product.slug, price, compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null, images: product.images },
        discountType: matchingRule.discountType as 'percentage' | 'fixed',
        discountValue,
        finalPrice,
      },
    }
  } catch {
    return { success: false, data: null }
  }
}

export async function addUpsellToOrder(orderId: string, ruleId: string, productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const store = await getCurrentStore()
    if (!store) return { success: false, error: 'المتجر غير موجود' }

    const [order] = await db
      .select({ id: storeOrders.id, total: storeOrders.total })
      .from(storeOrders)
      .where(and(eq(storeOrders.id, orderId), eq(storeOrders.storeId, store.id)))
      .limit(1)
    if (!order) return { success: false, error: 'الطلب غير موجود' }

    const [rule] = await db
      .select()
      .from(storeUpsellRules)
      .where(and(eq(storeUpsellRules.id, ruleId), eq(storeUpsellRules.storeId, store.id), eq(storeUpsellRules.isActive, true)))
      .limit(1)
    if (!rule) return { success: false, error: 'العرض غير متاح' }

    const [product] = await db.select().from(storeProducts).where(and(eq(storeProducts.id, productId), eq(storeProducts.isActive, true))).limit(1)
    if (!product || product.stock <= 0) return { success: false, error: 'المنتج غير متاح' }

    const price = Number(product.price)
    const discountValue = Number(rule.discountValue)
    const finalPrice = rule.discountType === 'percentage'
      ? Math.round(price * (1 - discountValue / 100) * 100) / 100
      : Math.max(0, price - discountValue)

    await db.insert(storeOrderItems).values({
      orderId, storeId: store.id, productId: product.id, variantId: null,
      name: `${product.name} (عرض Upsell)`, price: finalPrice.toFixed(2),
      quantity: 1, total: finalPrice.toFixed(2), image: product.images[0] ?? null,
    })

    const newTotal = Number(order.total) + finalPrice
    await db.update(storeOrders).set({ total: newTotal.toFixed(2), updatedAt: new Date() }).where(eq(storeOrders.id, orderId))

    if (product.trackInventory) {
      await db.update(storeProducts).set({ stock: sql`GREATEST(0, ${storeProducts.stock} - 1)` }).where(eq(storeProducts.id, productId))
    }

    return { success: true }
  } catch {
    return { success: false, error: 'حدث خطأ' }
  }
}
