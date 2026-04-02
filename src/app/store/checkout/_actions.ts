'use server'

import { db } from '@/db'
import {
  stores,
  storeProducts,
  storeOrders,
  storeOrderItems,
  storeCustomers,
  storeCoupons,
  storeShippingZones,
  storeAbandonedCarts,
  storeLoyaltyPoints,
  storeAffiliates,
  storeAffiliateSales,
} from '@/db/schema'
import { eq, and, ne, sql, inArray } from 'drizzle-orm'
import { checkoutSchema } from '@/lib/validations/order'
import { nanoid } from 'nanoid'
import type { ShippingAddress, VariantOption } from '@/db/schema'
import { checkCustomerTrust } from '@/lib/customers/customer-check'
import { updateCustomerTrustScore } from '@/lib/customers/trust-score'
import { cookies } from 'next/headers'

type CheckoutProductVariant = {
  id: string
  options: VariantOption[]
  price: number | null
  stock: number
  sku: string | null
  isActive?: boolean
}

function getVariantPrice(variant: CheckoutProductVariant, fallbackPrice: number) {
  return typeof variant.price === 'number' ? variant.price : fallbackPrice
}

function getVariantStock(variant: CheckoutProductVariant) {
  return typeof variant.stock === 'number' ? variant.stock : 0
}

type CheckoutStoreSettings = {
  currency: string
  minOrderAmount: number | null
  maxOrderAmount: number | null
  enableCod: boolean
  enableKashier: boolean
}

function normalizeCheckoutSettings(input: unknown): CheckoutStoreSettings {
  const value =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : {}
  return {
    currency: typeof value.currency === 'string' ? value.currency : 'EGP',
    minOrderAmount: typeof value.minOrderAmount === 'number' ? value.minOrderAmount : null,
    maxOrderAmount: typeof value.maxOrderAmount === 'number' ? value.maxOrderAmount : null,
    enableCod: typeof value.enableCod === 'boolean' ? value.enableCod : true,
    enableKashier: typeof value.enableKashier === 'boolean' ? value.enableKashier : true,
  }
}

type CheckoutResult =
  | { success: true; data: { orderId: string; orderNumber: string; total: number; paymentUrl?: string; paymentError?: string } }
  | { success: false; error: string }

export async function submitOrder(body: unknown): Promise<CheckoutResult> {
  try {
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' }
    }

    const {
      storeId,
      items,
      shipping,
      shippingLocation,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      couponCode,
      loyaltyPointsToRedeem,
    } = parsed.data

    const shippingInput = {
      governorate: shipping.governorate?.trim() ?? '',
      city: shipping.city?.trim() ?? '',
      area: shipping.area?.trim() ?? '',
      street: shipping.street?.trim() ?? '',
      building: shipping.building?.trim() ?? '',
      floor: shipping.floor?.trim() ?? '',
      apartment: shipping.apartment?.trim() ?? '',
      landmark: shipping.landmark?.trim() ?? '',
      postalCode: shipping.postalCode?.trim() ?? '',
    }

    const hasCoordinates = Boolean(shippingLocation)
    const normalizedShipping: ShippingAddress = {
      governorate: shippingInput.governorate || (hasCoordinates ? 'غير محدد (اعتمادًا على الإحداثيات)' : 'غير محدد'),
      city: shippingInput.city || 'غير محدد',
      area: shippingInput.area || 'غير محدد',
      street: shippingInput.street || 'غير محدد',
      building: shippingInput.building || undefined,
      floor: shippingInput.floor || undefined,
      apartment: shippingInput.apartment || undefined,
      landmark: shippingInput.landmark || undefined,
      postalCode: shippingInput.postalCode || undefined,
    }

    // 1. Verify store
    const store = await db.select().from(stores).where(and(eq(stores.id, storeId), eq(stores.isActive, true))).limit(1)
    if (!store[0]) return { success: false, error: 'المتجر غير موجود' }

    // P1: Fake Order Blocker
    const customerCheck = await checkCustomerTrust(customerPhone, storeId, {
      fakeOrderBlockerEnabled: (store[0].settings as Record<string, unknown>)?.fakeOrderBlockerEnabled as boolean | undefined,
      fakeOrderMinTrustScore: (store[0].settings as Record<string, unknown>)?.fakeOrderMinTrustScore as number | undefined,
      fakeOrderAutoReject: (store[0].settings as Record<string, unknown>)?.fakeOrderAutoReject as boolean | undefined,
    })
    if (!customerCheck.allowed) return { success: false, error: customerCheck.reason ?? 'غير مسموح بالطلب' }

    // 2. Pre-fetch products
    const productIds = items.map((i) => i.productId)
    const products = await db.select().from(storeProducts).where(and(inArray(storeProducts.id, productIds), eq(storeProducts.storeId, storeId), eq(storeProducts.isActive, true)))
    const productMap = new Map(products.map((p) => [p.id, p]))

    let subtotal = 0
    const orderItems: { productId: string; variantId: string | null; name: string; price: number; quantity: number; variantOptions: VariantOption[] | null; image: string | null }[] = []

    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) return { success: false, error: 'المنتج غير متوفر' }

      let itemPrice = parseFloat(product.price)
      let variantOptions: VariantOption[] | null = null

      if (item.variantId && product.variants.length > 0) {
        const variant = (product.variants as CheckoutProductVariant[]).find((v) => v.id === item.variantId)
        if (!variant || variant.isActive === false) return { success: false, error: 'المتغير المحدد غير متوفر' }
        itemPrice = getVariantPrice(variant, parseFloat(product.price))
        variantOptions = variant.options
      }

      subtotal += itemPrice * item.quantity
      orderItems.push({ productId: product.id, variantId: item.variantId ?? null, name: product.name, price: itemPrice, quantity: item.quantity, variantOptions, image: product.images[0] ?? null })
    }

    // 3. Validate payment + min/max
    const storeSettings = normalizeCheckoutSettings(store[0].settings)
    if (paymentMethod === 'cod' && !storeSettings.enableCod) return { success: false, error: 'الدفع عند الاستلام غير متاح حالياً' }
    if (paymentMethod === 'kashier' && !storeSettings.enableKashier) return { success: false, error: 'الدفع الإلكتروني غير متاح حالياً' }
    if (storeSettings.minOrderAmount && subtotal < storeSettings.minOrderAmount) return { success: false, error: `الحد الأدنى للطلب هو ${storeSettings.minOrderAmount} ${storeSettings.currency}` }
    if (storeSettings.maxOrderAmount && subtotal > storeSettings.maxOrderAmount) return { success: false, error: `الحد الأقصى للطلب هو ${storeSettings.maxOrderAmount} ${storeSettings.currency}` }

    // 4. Shipping cost
    let shippingCost = 0
    const shippingZones = await db.select().from(storeShippingZones).where(and(eq(storeShippingZones.storeId, storeId), eq(storeShippingZones.isActive, true)))
    const matchingZone = shippingInput.governorate ? shippingZones.find((zone) => zone.governorates.includes(shippingInput.governorate)) : undefined
    if (matchingZone) {
      shippingCost = parseFloat(matchingZone.shippingFee)
      if (matchingZone.freeShippingMinimum && subtotal >= parseFloat(matchingZone.freeShippingMinimum)) shippingCost = 0
    }

    // 5. Coupon
    let discount = 0
    let appliedCouponCode: string | null = null
    let appliedCouponId: string | null = null

    if (couponCode) {
      const coupon = await db.select().from(storeCoupons).where(and(eq(storeCoupons.storeId, storeId), eq(storeCoupons.code, couponCode.toUpperCase()), eq(storeCoupons.isActive, true))).limit(1)
      if (!coupon[0]) return { success: false, error: 'الكوبون غير صالح' }
      const c = coupon[0]
      const now = new Date()
      if (c.startsAt && now < c.startsAt) return { success: false, error: 'الكوبون لم يبدأ بعد' }
      if (c.expiresAt && now > c.expiresAt) return { success: false, error: 'الكوبون منتهي الصلاحية' }
      if (c.minOrderAmount && subtotal < parseFloat(c.minOrderAmount)) return { success: false, error: `الحد الأدنى لاستخدام الكوبون هو ${c.minOrderAmount} ${storeSettings.currency}` }

      // P3: First order only
      if (c.firstOrderOnly && customerPhone) {
        const existingOrders = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(storeOrders)
          .where(and(
            eq(storeOrders.storeId, storeId),
            eq(storeOrders.customerPhone, customerPhone),
            ne(storeOrders.orderStatus, 'cancelled'),
          ))
        if ((existingOrders[0]?.count ?? 0) > 0) {
          return { success: false, error: 'هذا الكوبون متاح لأول طلب فقط' }
        }
      }

      // P3: Per-customer usage limit
      if (c.usagePerCustomer && customerPhone) {
        const customerUsage = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(storeOrders)
          .where(and(
            eq(storeOrders.storeId, storeId),
            eq(storeOrders.customerPhone, customerPhone),
            eq(storeOrders.couponCode, c.code),
          ))
        if ((customerUsage[0]?.count ?? 0) >= c.usagePerCustomer) {
          return { success: false, error: 'تم استخدام هذا الكوبون بالحد الأقصى المسموح لك' }
        }
      }

      // P3: Applicable products check
      const applicableProductIds = c.applicableProductIds ?? []
      if (applicableProductIds.length > 0) {
        const cartProductIds = items.map(i => i.productId)
        const hasApplicable = cartProductIds.some(id => applicableProductIds.includes(id))
        if (!hasApplicable) {
          return { success: false, error: 'هذا الكوبون لا ينطبق على المنتجات في السلة' }
        }
      }

      // P3: Applicable categories check
      const applicableCategoryIds = c.applicableCategoryIds ?? []
      if (applicableCategoryIds.length > 0) {
        const cartCategoryIds = products.map(p => p.categoryId).filter(Boolean) as string[]
        const hasApplicable = cartCategoryIds.some(id => applicableCategoryIds.includes(id))
        if (!hasApplicable) {
          return { success: false, error: 'هذا الكوبون لا ينطبق على تصنيفات المنتجات في السلة' }
        }
      }

      // P3: Free shipping coupon
      if (c.isFreeShipping) {
        shippingCost = 0
        appliedCouponCode = c.code
        appliedCouponId = c.id
      } else {
        if (c.type === 'percentage') {
          discount = subtotal * (parseFloat(c.value) / 100)
          if (c.maxDiscount) discount = Math.min(discount, parseFloat(c.maxDiscount))
        } else {
          discount = parseFloat(c.value)
        }
        discount = Math.min(discount, subtotal)
        appliedCouponCode = c.code
        appliedCouponId = c.id
      }
    }

    // 5b. Loyalty points redemption (P3)
    let loyaltyDiscount = 0
    let loyaltyPointsUsed = 0
    if (loyaltyPointsToRedeem && loyaltyPointsToRedeem > 0) {
      const loyaltySettings = store[0].settings as Record<string, unknown>
      if (loyaltySettings?.loyaltyEnabled) {
        const loyaltyPointValue = (loyaltySettings.loyaltyPointValue as number) || 0
        const loyaltyMinRedemption = (loyaltySettings.loyaltyMinRedemption as number) || 0
        const loyaltyMaxRedemptionPercent = (loyaltySettings.loyaltyMaxRedemptionPercent as number) || 50

        if (loyaltyPointsToRedeem < loyaltyMinRedemption) {
          return { success: false, error: `أقل عدد نقاط للاستبدال هو ${loyaltyMinRedemption}` }
        }

        const [balanceResult] = await db
          .select({ balance: sql<number>`COALESCE(SUM(points), 0)::int` })
          .from(storeLoyaltyPoints)
          .where(and(
            eq(storeLoyaltyPoints.storeId, storeId),
            eq(storeLoyaltyPoints.customerPhone, customerPhone),
          ))

        const balance = balanceResult?.balance ?? 0
        if (loyaltyPointsToRedeem > balance) {
          return { success: false, error: 'رصيد النقاط غير كافي' }
        }

        const pointsDiscount = loyaltyPointsToRedeem * loyaltyPointValue
        const maxDiscount = subtotal * (loyaltyMaxRedemptionPercent / 100)
        loyaltyDiscount = Math.min(pointsDiscount, maxDiscount, subtotal - discount)
        loyaltyPointsUsed = loyaltyPointsToRedeem
      }
    }

    // 6. Total
    const total = subtotal + shippingCost - discount - loyaltyDiscount
    const orderNumber = `ORD-${nanoid(8).toUpperCase()}`

    // 7. Transaction
    const order = await db.transaction(async (tx) => {
      // Re-check stock
      for (const item of items) {
        const freshProduct = await tx.select().from(storeProducts).where(eq(storeProducts.id, item.productId)).limit(1)
        if (!freshProduct[0] || !freshProduct[0].isActive) throw new Error(`PRODUCT_UNAVAILABLE:${item.productId}`)
        const product = freshProduct[0]
        if (item.variantId && product.variants.length > 0) {
          const variant = (product.variants as CheckoutProductVariant[]).find((v) => v.id === item.variantId)
          if (!variant || variant.isActive === false || getVariantStock(variant) < item.quantity) throw new Error(`INSUFFICIENT_STOCK:${product.name}`)
        } else if (product.trackInventory && product.stock < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`)
        }
      }

      // Atomic coupon
      if (appliedCouponId) {
        const couponResult = await tx.update(storeCoupons).set({ usedCount: sql`${storeCoupons.usedCount} + 1` }).where(and(eq(storeCoupons.id, appliedCouponId), sql`(${storeCoupons.usageLimit} IS NULL OR ${storeCoupons.usedCount} < ${storeCoupons.usageLimit})`)).returning({ id: storeCoupons.id })
        if (!couponResult[0]) throw new Error('COUPON_EXHAUSTED')
      }

      // Customer
      let customerId: string | null = null
      const existingCustomer = await tx.select().from(storeCustomers).where(and(eq(storeCustomers.storeId, storeId), eq(storeCustomers.phone, customerPhone))).limit(1)
      if (existingCustomer[0]) {
        customerId = existingCustomer[0].id
        await tx.update(storeCustomers).set({ name: customerName, email: customerEmail ?? existingCustomer[0].email, address: normalizedShipping, totalOrders: sql`${storeCustomers.totalOrders} + 1`, totalSpent: sql`${storeCustomers.totalSpent} + ${String(total)}`, lastOrderAt: new Date() }).where(eq(storeCustomers.id, existingCustomer[0].id))
      } else {
        const newCustomer = await tx.insert(storeCustomers).values({ storeId, name: customerName, phone: customerPhone, email: customerEmail, address: normalizedShipping, totalOrders: 1, totalSpent: String(total), lastOrderAt: new Date() }).returning({ id: storeCustomers.id })
        customerId = newCustomer[0]?.id ?? null
      }

      // Create order
      const newOrder = await tx.insert(storeOrders).values({
        storeId, orderNumber, customerId, customerName, customerPhone, customerEmail,
        shippingAddress: normalizedShipping,
        shippingLatitude: shippingLocation ? String(shippingLocation.latitude) : null,
        shippingLongitude: shippingLocation ? String(shippingLocation.longitude) : null,
        subtotal: String(subtotal), shippingCost: String(shippingCost), discount: String(discount + loyaltyDiscount), total: String(total),
        couponCode: appliedCouponCode, paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
        orderStatus: 'pending',
      }).returning()
      const createdOrder = newOrder[0]!

      // Create order items
      await tx.insert(storeOrderItems).values(orderItems.map((item) => ({
        orderId: createdOrder.id, storeId, productId: item.productId, variantId: item.variantId,
        name: item.name, price: String(item.price), quantity: item.quantity,
        total: String(item.price * item.quantity), variantOptions: item.variantOptions, image: item.image,
      })))

      // Decrease stock
      for (const item of items) {
        const product = productMap.get(item.productId)
        if (!product?.trackInventory) continue
        if (item.variantId && product.variants.length > 0) {
          const freshProduct = await tx.select({ variants: storeProducts.variants }).from(storeProducts).where(eq(storeProducts.id, item.productId)).limit(1)
          if (freshProduct[0]) {
            const updatedVariants = freshProduct[0].variants.map((v) => v.id === item.variantId ? { ...v, stock: Math.max(0, v.stock - item.quantity) } : v)
            await tx.update(storeProducts).set({ variants: updatedVariants }).where(eq(storeProducts.id, item.productId))
          }
        } else {
          await tx.update(storeProducts).set({ stock: sql`GREATEST(0, ${storeProducts.stock} - ${item.quantity})` }).where(eq(storeProducts.id, item.productId))
        }
      }

      // P3: Deduct loyalty points
      if (loyaltyPointsUsed > 0) {
        await tx.insert(storeLoyaltyPoints).values({
          storeId,
          customerPhone,
          points: -loyaltyPointsUsed,
          type: 'redeemed',
          orderId: createdOrder.id,
          notes: `استبدال ${loyaltyPointsUsed} نقطة في طلب #${orderNumber}`,
        })
      }

      return createdOrder
    })

    // Fire-and-forget: trust score + abandoned cart recovery
    updateCustomerTrustScore(customerPhone, 'new_order').catch(() => {})
    db.update(storeAbandonedCarts).set({ recoveryStatus: 'recovered', recoveredOrderId: order.id }).where(and(eq(storeAbandonedCarts.storeId, storeId), eq(storeAbandonedCarts.customerPhone, customerPhone), eq(storeAbandonedCarts.recoveryStatus, 'pending'))).catch(() => {})

    // P3: Affiliate tracking — fire-and-forget
    const cookieStore = await cookies()
    const refCode = cookieStore.get('matjary_ref')?.value
    if (refCode) {
      ;(async () => {
        try {
          const [affiliate] = await db
            .select()
            .from(storeAffiliates)
            .where(and(
              eq(storeAffiliates.storeId, storeId),
              eq(storeAffiliates.code, refCode),
              eq(storeAffiliates.isActive, true),
            ))
            .limit(1)

          if (affiliate) {
            const commissionAmount = Number(order.total) * (Number(affiliate.commissionRate) / 100)

            await db.insert(storeAffiliateSales).values({
              storeId,
              affiliateId: affiliate.id,
              orderId: order.id,
              saleAmount: order.total,
              commissionAmount: commissionAmount.toFixed(2),
              status: 'pending',
            })

            await db
              .update(storeAffiliates)
              .set({
                totalSales: sql`${storeAffiliates.totalSales}::numeric + ${order.total}::numeric`,
                totalCommission: sql`${storeAffiliates.totalCommission}::numeric + ${commissionAmount.toFixed(2)}::numeric`,
                pendingCommission: sql`${storeAffiliates.pendingCommission}::numeric + ${commissionAmount.toFixed(2)}::numeric`,
              })
              .where(eq(storeAffiliates.id, affiliate.id))
          }
        } catch (e) {
          console.error('Affiliate tracking error:', e)
        }
      })()
    }

    // Kashier payment
    let paymentUrl: string | undefined = undefined
    if (paymentMethod === 'kashier') {
      try {
        const { createKashierSession } = await import('@/lib/payments/kashier')
        const kashierResponse = await createKashierSession({
          orderId: order.id, orderNumber: order.orderNumber, amount: order.total,
          currency: (store[0].settings as Record<string, unknown>).currency as string,
          customerName, customerEmail, storeId,
        })
        paymentUrl = kashierResponse.redirectUrl
      } catch {
        return { success: true, data: { orderId: order.id, orderNumber: order.orderNumber, total: parseFloat(order.total), paymentUrl: undefined, paymentError: 'فشل في إنشاء جلسة الدفع — يمكنك إعادة المحاولة' } }
      }
    }

    return { success: true, data: { orderId: order.id, orderNumber: order.orderNumber, total: parseFloat(order.total), paymentUrl } }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('INSUFFICIENT_STOCK:')) return { success: false, error: `الكمية المطلوبة من "${error.message.split(':')[1]}" غير متوفرة` }
      if (error.message === 'COUPON_EXHAUSTED') return { success: false, error: 'تم استنفاد استخدامات هذا الكوبون' }
      if (error.message.startsWith('PRODUCT_UNAVAILABLE:')) return { success: false, error: 'المنتج غير متوفر' }
    }
    console.error('Error processing checkout:', error)
    return { success: false, error: 'حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.' }
  }
}
