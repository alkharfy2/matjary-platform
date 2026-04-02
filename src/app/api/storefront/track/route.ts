import { NextRequest } from 'next/server'
import { apiSuccess, apiError, handleApiError } from '@/lib/api/response'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { db } from '@/db'
import { storeOrders, storeOrderItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/api/rate-limit'

const trackSchema = z.object({
  orderNumber: z.string().min(1).max(50),
  phone: z.string().min(8).max(20),
})

export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return apiError('المتجر غير موجود', 404)

    const ip = getClientIp(request)
    const { allowed } = rateLimit(`track:${ip}`, { maxRequests: 10, windowSeconds: 60 })
    if (!allowed) return apiError('حاول مرة أخرى بعد قليل', 429)

    const body = await request.json()
    const data = trackSchema.parse(body)

    // Clean phone: remove spaces, dashes, and +
    const cleanPhone = data.phone.replace(/[\s\-+]/g, '')

    const order = await db.query.storeOrders.findFirst({
      where: and(
        eq(storeOrders.storeId, store.id),
        eq(storeOrders.orderNumber, data.orderNumber),
      ),
    })

    if (!order) {
      return apiError('لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف.', 404)
    }

    // Verify phone matches (compare last 10 digits)
    const orderPhone = (order.customerPhone ?? '').replace(/[\s\-+]/g, '')
    const phoneLast10 = cleanPhone.slice(-10)
    const orderPhoneLast10 = orderPhone.slice(-10)

    if (phoneLast10 !== orderPhoneLast10) {
      return apiError('لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف.', 404)
    }

    // Get order items
    const items = await db.query.storeOrderItems.findMany({
      where: eq(storeOrderItems.orderId, order.id),
    })

    // Build timeline
    const timeline: { status: string; label: string; date: string | null; active: boolean }[] = [
      {
        status: 'pending',
        label: 'تم استلام الطلب',
        date: order.createdAt.toISOString(),
        active: true,
      },
      {
        status: 'confirmed',
        label: 'تم تأكيد الطلب',
        date: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.orderStatus)
          ? order.createdAt.toISOString()
          : null,
        active: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.orderStatus),
      },
      {
        status: 'processing',
        label: 'قيد التحضير',
        date: ['processing', 'shipped', 'delivered'].includes(order.orderStatus)
          ? order.createdAt.toISOString()
          : null,
        active: ['processing', 'shipped', 'delivered'].includes(order.orderStatus),
      },
      {
        status: 'shipped',
        label: 'تم الشحن',
        date: order.shippedAt?.toISOString() ?? null,
        active: ['shipped', 'delivered'].includes(order.orderStatus),
      },
      {
        status: 'delivered',
        label: 'تم التوصيل',
        date: order.deliveredAt?.toISOString() ?? null,
        active: order.orderStatus === 'delivered',
      },
    ]

    // If cancelled, replace timeline
    if (order.orderStatus === 'cancelled') {
      timeline.push({
        status: 'cancelled',
        label: 'تم إلغاء الطلب',
        date: order.cancelledAt?.toISOString() ?? null,
        active: true,
      })
    }

    return apiSuccess({
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      currency: store.settings.currency,
      trackingNumber: order.trackingNumber,
      shippingCompany: order.shippingCompany,
      timeline,
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        image: item.image,
      })),
      createdAt: order.createdAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
