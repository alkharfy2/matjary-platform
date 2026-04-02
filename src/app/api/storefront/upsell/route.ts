export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeUpsellRules, storeProducts, storeOrders, storeOrderItems } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, apiError } from '@/lib/api/response'

/**
 * GET /api/storefront/upsell?orderId=xxx — عرض upsell مطابق للطلب
 */
export async function GET(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const orderId = request.nextUrl.searchParams.get('orderId')
    if (!orderId) return apiError('orderId مطلوب', 400)

    // Get order items to find trigger products
    const orderItems = await db
      .select({ productId: storeOrderItems.productId })
      .from(storeOrderItems)
      .where(and(
        eq(storeOrderItems.orderId, orderId),
        eq(storeOrderItems.storeId, store.id),
      ))

    const productIds = orderItems.map((i) => i.productId).filter(Boolean) as string[]

    if (productIds.length === 0) {
      return apiSuccess(null)
    }

    // Find matching upsell rules (specific trigger OR any-product trigger)
    const rules = await db
      .select()
      .from(storeUpsellRules)
      .where(and(
        eq(storeUpsellRules.storeId, store.id),
        eq(storeUpsellRules.isActive, true),
      ))
      .orderBy(storeUpsellRules.sortOrder)

    // Find the best matching rule
    const matchingRule = rules.find((rule) => {
      if (!rule.triggerProductId) return true // any-product trigger
      return productIds.includes(rule.triggerProductId)
    })

    if (!matchingRule) {
      return apiSuccess(null)
    }

    // Don't offer a product already in the order
    if (productIds.includes(matchingRule.offerProductId)) {
      return apiSuccess(null)
    }

    // Get the offer product
    const [product] = await db
      .select({
        id: storeProducts.id,
        name: storeProducts.name,
        slug: storeProducts.slug,
        price: storeProducts.price,
        compareAtPrice: storeProducts.compareAtPrice,
        images: storeProducts.images,
        stock: storeProducts.stock,
      })
      .from(storeProducts)
      .where(and(
        eq(storeProducts.id, matchingRule.offerProductId),
        eq(storeProducts.isActive, true),
      ))
      .limit(1)

    if (!product || product.stock <= 0) {
      return apiSuccess(null)
    }

    const price = Number(product.price)
    const discountValue = Number(matchingRule.discountValue)
    const finalPrice = matchingRule.discountType === 'percentage'
      ? Math.round(price * (1 - discountValue / 100) * 100) / 100
      : Math.max(0, price - discountValue)

    return apiSuccess({
      ruleId: matchingRule.id,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price,
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
        images: product.images,
      },
      discountType: matchingRule.discountType,
      discountValue,
      finalPrice,
    })
  } catch {
    return apiError('حدث خطأ', 500)
  }
}

/**
 * POST /api/storefront/upsell — إضافة منتج upsell للطلب
 */
export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const body = await request.json()
    const { orderId, ruleId, productId } = body

    if (!orderId || !ruleId || !productId) {
      return apiError('بيانات ناقصة', 400)
    }

    // Verify order belongs to store
    const [order] = await db
      .select({ id: storeOrders.id, total: storeOrders.total })
      .from(storeOrders)
      .where(and(
        eq(storeOrders.id, orderId),
        eq(storeOrders.storeId, store.id),
      ))
      .limit(1)

    if (!order) return apiError('الطلب غير موجود', 404)

    // Verify upsell rule
    const [rule] = await db
      .select()
      .from(storeUpsellRules)
      .where(and(
        eq(storeUpsellRules.id, ruleId),
        eq(storeUpsellRules.storeId, store.id),
        eq(storeUpsellRules.isActive, true),
      ))
      .limit(1)

    if (!rule) return apiError('العرض غير متاح', 404)

    // Get product
    const [product] = await db
      .select()
      .from(storeProducts)
      .where(and(
        eq(storeProducts.id, productId),
        eq(storeProducts.isActive, true),
      ))
      .limit(1)

    if (!product || product.stock <= 0) {
      return apiError('المنتج غير متاح', 422)
    }

    const price = Number(product.price)
    const discountValue = Number(rule.discountValue)
    const finalPrice = rule.discountType === 'percentage'
      ? Math.round(price * (1 - discountValue / 100) * 100) / 100
      : Math.max(0, price - discountValue)

    // Add as order item
    await db.insert(storeOrderItems).values({
      orderId,
      storeId: store.id,
      productId: product.id,
      variantId: null,
      name: `${product.name} (عرض Upsell)`,
      price: finalPrice.toFixed(2),
      quantity: 1,
      total: finalPrice.toFixed(2),
      image: product.images[0] ?? null,
    })

    // Update order total
    const newTotal = Number(order.total) + finalPrice
    await db
      .update(storeOrders)
      .set({ total: newTotal.toFixed(2), updatedAt: new Date() })
      .where(eq(storeOrders.id, orderId))

    // Decrease stock
    if (product.trackInventory) {
      await db
        .update(storeProducts)
        .set({ stock: sql`GREATEST(0, ${storeProducts.stock} - 1)` })
        .where(eq(storeProducts.id, productId))
    }

    return apiSuccess({ added: true, finalPrice, newTotal })
  } catch {
    return apiError('حدث خطأ', 500)
  }
}
