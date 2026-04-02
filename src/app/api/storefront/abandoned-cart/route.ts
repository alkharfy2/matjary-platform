export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeAbandonedCarts, storeOrders } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { and, eq, gt } from 'drizzle-orm'
import { sendConversionEvent } from '@/lib/tracking/facebook-capi'
import { generateEventId } from '@/lib/tracking/event-deduplication'
import { getClientIp } from '@/lib/api/rate-limit'

/**
 * POST /api/storefront/abandoned-cart — حفظ سلة متروكة من الـ storefront
 * يُستدعى عبر navigator.sendBeacon عند مغادرة العميل
 */
export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return new Response(null, { status: 404 })

    // لو الميزة مش مفعّلة
    if (!store.settings.abandonedCartEnabled) {
      return new Response(null, { status: 204 })
    }

    const body = await request.json()
    const { customerName, customerPhone, customerEmail, items } = body

    if (!customerName || !customerPhone || !items?.length) {
      return new Response(null, { status: 400 })
    }

    // التأكد إنه مفيش طلب اتعمل بالفعل بنفس الرقم في آخر 10 دقائق
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    const [recentOrder] = await db
      .select({ id: storeOrders.id })
      .from(storeOrders)
      .where(and(
        eq(storeOrders.storeId, store.id),
        eq(storeOrders.customerPhone, customerPhone),
        gt(storeOrders.createdAt, tenMinutesAgo),
      ))
      .limit(1)

    if (recentOrder) {
      // العميل كمّل طلبه — مش abandoned
      return new Response(null, { status: 204 })
    }

    // التأكد إنه مفيش سلة متروكة بنفس الرقم في آخر ساعة (منع التكرار)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const [existingCart] = await db
      .select({ id: storeAbandonedCarts.id })
      .from(storeAbandonedCarts)
      .where(and(
        eq(storeAbandonedCarts.storeId, store.id),
        eq(storeAbandonedCarts.customerPhone, customerPhone),
        gt(storeAbandonedCarts.createdAt, oneHourAgo),
      ))
      .limit(1)

    if (existingCart) {
      // حدّث السلة الموجودة بدل ما نعمل واحدة جديدة
      const subtotal = items.reduce(
        (sum: number, i: { unitPrice: number; quantity: number }) => sum + i.unitPrice * i.quantity, 0,
      )
      await db
        .update(storeAbandonedCarts)
        .set({ items, subtotal: subtotal.toFixed(2) })
        .where(eq(storeAbandonedCarts.id, existingCart.id))
      return new Response(null, { status: 204 })
    }

    const subtotal = items.reduce(
      (sum: number, i: { unitPrice: number; quantity: number }) => sum + i.unitPrice * i.quantity, 0,
    )

    await db.insert(storeAbandonedCarts).values({
      storeId: store.id,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      items,
      subtotal: subtotal.toFixed(2),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
    })

    // === CAPI: Lead Event (fire-and-forget) ===
    if (store.settings.facebookConversionApiEnabled &&
        store.settings.facebookPixelId &&
        store.settings.facebookConversionApiToken) {
      sendConversionEvent(
        {
          pixelId: store.settings.facebookPixelId,
          accessToken: store.settings.facebookConversionApiToken,
          testEventCode: store.settings.facebookTestEventCode,
        },
        'Lead',
        {
          email: customerEmail ?? undefined,
          phone: customerPhone,
          clientIpAddress: getClientIp(request),
          clientUserAgent: request.headers.get('user-agent') ?? undefined,
        },
        {
          currency: store.settings.currency,
          value: subtotal,
        },
        request.headers.get('referer') ?? `https://${store.slug}.matjary.com`,
        generateEventId('lead'),
      ).catch(() => {})
    }

    return new Response(null, { status: 201 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
