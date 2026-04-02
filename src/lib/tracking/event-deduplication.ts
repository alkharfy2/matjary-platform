import { nanoid } from 'nanoid'

/**
 * توليد event_id فريد لـ Deduplication بين Client Pixel و Server CAPI.
 *
 * الفكرة:
 * - Client-side: fbq('track', 'Purchase', data, { eventID: eventId })
 * - Server-side: sendConversionEvent(..., eventId)
 * - Facebook بيدمجهم كحدث واحد ← لا تكرار
 */
export function generateEventId(eventPrefix: string): string {
  return `${eventPrefix}_${nanoid(12)}`
}

/**
 * توليد event_id للـ Purchase event
 * يُستخدم في checkout لربط Client + Server
 */
export function generatePurchaseEventId(orderNumber: string): string {
  return `purchase_${orderNumber}`
}

/**
 * توليد event_id لأحداث المنتج
 */
export function generateProductEventId(
  event: 'viewcontent' | 'addtocart',
  productId: string,
): string {
  return `${event}_${productId}_${nanoid(8)}`
}

/**
 * توليد event_id للـ InitiateCheckout
 */
export function generateCheckoutEventId(): string {
  return `checkout_${nanoid(12)}`
}
