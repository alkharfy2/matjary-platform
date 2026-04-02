/**
 * Snapchat Pixel — Client-Side Tracking
 *
 * المرجع: https://businesshelp.snapchat.com/s/article/snap-pixel-about
 */

function getSnaptr(): ((...args: unknown[]) => void) | null {
  if (typeof window !== 'undefined' && window.snaptr) {
    return window.snaptr as (...args: unknown[]) => void
  }
  return null
}

export function snapTrackViewContent(data: {
  contentId: string
  contentName: string
  price: number
  currency: string
}) {
  getSnaptr()?.('track', 'VIEW_CONTENT', {
    item_ids: [data.contentId],
    item_category: data.contentName,
    price: data.price,
    currency: data.currency,
  })
}

export function snapTrackAddToCart(data: {
  contentId: string
  contentName: string
  price: number
  currency: string
  quantity?: number
}) {
  getSnaptr()?.('track', 'ADD_CART', {
    item_ids: [data.contentId],
    item_category: data.contentName,
    price: data.price * (data.quantity ?? 1),
    currency: data.currency,
    number_items: data.quantity ?? 1,
  })
}

export function snapTrackInitiateCheckout(data: {
  contentIds: string[]
  value: number
  currency: string
}) {
  getSnaptr()?.('track', 'START_CHECKOUT', {
    item_ids: data.contentIds,
    price: data.value,
    currency: data.currency,
    number_items: data.contentIds.length,
  })
}

export function snapTrackPurchase(data: {
  contentIds: string[]
  value: number
  currency: string
  orderId?: string
}) {
  getSnaptr()?.('track', 'PURCHASE', {
    item_ids: data.contentIds,
    price: data.value,
    currency: data.currency,
    number_items: data.contentIds.length,
    transaction_id: data.orderId,
  })
}

export function snapTrackPageView() {
  getSnaptr()?.('track', 'PAGE_VIEW')
}
