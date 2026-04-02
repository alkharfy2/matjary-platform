export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { updateOrderStatusSchema } from '@/lib/validations/order'
import {
  getOrderStatusLabel,
  isDashboardOrderStatus,
  orderStatusTransitions,
} from '@/lib/queries/dashboard-orders'
import { sendEmail } from '@/lib/email/resend'
import { updateCustomerTrustScore } from '@/lib/customers/trust-score'
import { storeLoyaltyPoints } from '@/db/schema'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/dashboard/orders/[id]/status — تحديث حالة الطلب
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    // Verify order exists and belongs to store
    const existing = await db
      .select({ id: storeOrders.id, orderStatus: storeOrders.orderStatus, customerPhone: storeOrders.customerPhone })
      .from(storeOrders)
      .where(and(eq(storeOrders.id, id), eq(storeOrders.storeId, store.id)))
      .limit(1)

    if (!existing[0]) return ApiErrors.notFound('الطلب')

    const body = await request.json()
    const parsed = updateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { orderStatus, trackingNumber, shippingCompany, internalNotes } = parsed.data

    const currentStatus = existing[0].orderStatus

    if (!isDashboardOrderStatus(currentStatus)) {
      return ApiErrors.validation('حالة الطلب الحالية غير مدعومة')
    }

    if (currentStatus !== orderStatus) {
      const allowedNextStatuses = orderStatusTransitions[currentStatus]
      if (!allowedNextStatuses.includes(orderStatus)) {
        return ApiErrors.validation(
          `لا يمكن نقل الطلب من حالة "${getOrderStatusLabel(currentStatus)}" إلى "${getOrderStatusLabel(orderStatus)}"`
        )
      }
    }

    // Build update data with timestamps
    const updateData: Record<string, unknown> = {
      orderStatus,
      updatedAt: new Date(),
    }

    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber
    if (shippingCompany !== undefined) updateData.shippingCompany = shippingCompany
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes
    if (orderStatus === 'refunded') updateData.paymentStatus = 'refunded'

    // Set status-specific timestamps
    const now = new Date()
    if (orderStatus === 'shipped' && existing[0].orderStatus !== 'shipped') {
      updateData.shippedAt = now
    }
    if (orderStatus === 'delivered' && existing[0].orderStatus !== 'delivered') {
      updateData.deliveredAt = now
    }
    if (orderStatus === 'cancelled' && existing[0].orderStatus !== 'cancelled') {
      updateData.cancelledAt = now
    }

    const updated = await db
      .update(storeOrders)
      .set(updateData)
      .where(and(eq(storeOrders.id, id), eq(storeOrders.storeId, store.id)))
      .returning()

    const updatedOrder = updated[0]

    // === P1: Update Trust Score on delivered/cancelled (fire-and-forget) ===
    if (existing[0].customerPhone) {
      if (orderStatus === 'delivered' && existing[0].orderStatus !== 'delivered') {
        updateCustomerTrustScore(existing[0].customerPhone, 'delivered').catch(() => {})
      }
      if (orderStatus === 'cancelled' && existing[0].orderStatus !== 'cancelled') {
        updateCustomerTrustScore(existing[0].customerPhone, 'cancelled').catch(() => {})
      }
    }

    // === P3: Loyalty points on delivered (fire-and-forget) ===
    if (orderStatus === 'delivered' && existing[0].orderStatus !== 'delivered' && updatedOrder) {
      const loyaltySettings = store.settings as Record<string, unknown> | null
      const loyaltyEnabled = Boolean(loyaltySettings?.loyaltyEnabled)
      const loyaltyPointsPerEgp = (loyaltySettings?.loyaltyPointsPerEgp as number) || 0
      if (loyaltyEnabled && loyaltyPointsPerEgp > 0 && existing[0].customerPhone) {
        const orderTotal = Number(updatedOrder.total)
        const pointsToEarn = Math.floor(orderTotal * loyaltyPointsPerEgp)
        if (pointsToEarn > 0) {
          db.insert(storeLoyaltyPoints).values({
            storeId: store.id,
            customerPhone: existing[0].customerPhone,
            points: pointsToEarn,
            type: 'earned',
            orderId: updatedOrder.id,
            notes: `كسب ${pointsToEarn} نقطة من طلب #${updatedOrder.orderNumber}`,
          }).catch(() => {})
        }
      }
    }

    // === Send status-specific emails (fire-and-forget) ===
    const storeSettings = store.settings as Record<string, unknown> | null
    if (updatedOrder?.customerEmail && storeSettings?.emailNotificationsEnabled !== false) {
      if (orderStatus === 'shipped' && existing[0].orderStatus !== 'shipped') {
        import('@/lib/email/templates/order-shipped').then(({ OrderShippedEmail }) =>
          sendEmail({
            to: updatedOrder.customerEmail!,
            subject: `📦 تم شحن طلبك #${updatedOrder.orderNumber}`,
            react: OrderShippedEmail({
              storeName: store.name,
              orderNumber: updatedOrder.orderNumber,
              customerName: updatedOrder.customerName,
              trackingNumber: trackingNumber ?? updatedOrder.trackingNumber,
              shippingCompany: shippingCompany ?? updatedOrder.shippingCompany,
              storeSlug: store.slug,
            }),
          }).catch(() => {})
        ).catch(() => {})
      }

      if (orderStatus === 'delivered' && existing[0].orderStatus !== 'delivered') {
        import('@/lib/email/templates/order-delivered').then(({ OrderDeliveredEmail }) =>
          sendEmail({
            to: updatedOrder.customerEmail!,
            subject: `✅ تم توصيل طلبك #${updatedOrder.orderNumber}`,
            react: OrderDeliveredEmail({
              storeName: store.name,
              orderNumber: updatedOrder.orderNumber,
              customerName: updatedOrder.customerName,
            }),
          }).catch(() => {})
        ).catch(() => {})
      }
    }

    // === P4-B: Auto Review Request on Delivery ===
    if (orderStatus === 'delivered' && existing[0].orderStatus !== 'delivered') {
      const reviewSettings = store.settings as Record<string, unknown> | null
      const autoReviewEnabled = reviewSettings?.autoReviewRequestEnabled !== false
      const reviewRequestDelay = Number(reviewSettings?.reviewRequestDelay ?? 2)

      if (autoReviewEnabled && updatedOrder?.customerEmail) {
        import('@/lib/reviews/create-review-request').then(({ createReviewRequest }) =>
          createReviewRequest({
            storeId: store.id,
            orderId: updatedOrder.id,
            customerEmail: updatedOrder.customerEmail,
            customerPhone: updatedOrder.customerPhone,
            customerName: updatedOrder.customerName,
            delayHours: reviewRequestDelay,
            storeName: store.name,
            storeSlug: store.slug,
          }).catch((err) => console.error('[ReviewRequest] Error:', err))
        ).catch(() => {})
      }
    }

    return apiSuccess(updatedOrder)
  } catch (error) {
    console.error('Error updating order status:', error)
    return handleApiError(error)
  }
}
