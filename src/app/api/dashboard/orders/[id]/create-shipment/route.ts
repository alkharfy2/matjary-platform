export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeOrders, storeShippingAccounts } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, and } from 'drizzle-orm'
import { createShippingProvider } from '@/lib/shipping/provider-factory'
import type { ShippingProvider } from '@/lib/shipping/types'

/**
 * POST /api/dashboard/orders/[id]/create-shipment — إنشاء بوليصة شحن
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    const { id: orderId } = await params

    const body = await request.json()
    const { provider, weight = 1, pieces = 1 } = body as { provider: string; weight?: number; pieces?: number }

    if (!provider) return ApiErrors.validation('يجب اختيار شركة الشحن')

    // 1. Get order
    const [order] = await db
      .select()
      .from(storeOrders)
      .where(and(eq(storeOrders.id, orderId), eq(storeOrders.storeId, store.id)))
      .limit(1)

    if (!order) return ApiErrors.notFound('الطلب')

    // 2. Get shipping account
    const [account] = await db
      .select()
      .from(storeShippingAccounts)
      .where(and(
        eq(storeShippingAccounts.storeId, store.id),
        eq(storeShippingAccounts.provider, provider as 'bosta' | 'aramex' | 'jnt' | 'mylerz'),
        eq(storeShippingAccounts.isActive, true),
      ))
      .limit(1)

    if (!account) return ApiErrors.validation('لم يتم إعداد شركة الشحن هذه')

    // 3. Create shipment
    const shippingClient = createShippingProvider(account.provider as ShippingProvider, {
      apiKey: account.apiKey,
      apiSecret: account.apiSecret ?? undefined,
      accountId: account.accountId ?? undefined,
      settings: account.settings as Record<string, unknown>,
    })

    const address = (order.shippingAddress ?? {}) as Record<string, string>

    const result = await shippingClient.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber ?? orderId.slice(0, 8),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: {
        governorate: address.governorate || address.state || '',
        city: address.city || '',
        area: address.area || address.zone || '',
        street: address.street || address.address || '',
        building: address.building,
        floor: address.floor,
        apartment: address.apartment,
      },
      codAmount: order.paymentMethod === 'cod' ? Number(order.total) : 0,
      weight,
      description: `طلب #${order.orderNumber}`,
      pieces,
    })

    // 4. Update order with tracking info
    await db
      .update(storeOrders)
      .set({
        trackingNumber: result.trackingNumber,
        shippingCompany: provider,
        orderStatus: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(storeOrders.id, orderId))

    return apiSuccess(result)
  } catch (error) {
    return handleApiError(error)
  }
}
