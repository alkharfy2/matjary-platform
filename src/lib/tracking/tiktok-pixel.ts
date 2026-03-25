/**
 * TikTok Pixel — Client-Side Tracking
 *
 * المرجع: https://business-api.tiktok.com/portal/docs?id=1739585696931842
 */

function getTtq(): Record<string, (...args: unknown[]) => void> | null {
  if (typeof window !== 'undefined' && window.ttq) {
    return window.ttq as Record<string, (...args: unknown[]) => void>
  }
  return null
}

export function ttqTrackViewContent(data: {
  contentId: string
  contentName: string
  contentCategory?: string
  price: number
  currency: string
  quantity?: number
}) {
  getTtq()?.track?.('ViewContent', {
    contents: [{
      content_id: data.contentId,
      content_name: data.contentName,
      content_category: data.contentCategory,
      quantity: data.quantity ?? 1,
      price: data.price,
    }],
    content_type: 'product',
    value: data.price * (data.quantity ?? 1),
    currency: data.currency,
  })
}

export function ttqTrackAddToCart(data: {
  contentId: string
  contentName: string
  price: number
  currency: string
  quantity?: number
}) {
  getTtq()?.track?.('AddToCart', {
    contents: [{
      content_id: data.contentId,
      content_name: data.contentName,
      quantity: data.quantity ?? 1,
      price: data.price,
    }],
    content_type: 'product',
    value: data.price * (data.quantity ?? 1),
    currency: data.currency,
  })
}

export function ttqTrackInitiateCheckout(data: {
  contentIds: string[]
  value: number
  currency: string
}) {
  getTtq()?.track?.('InitiateCheckout', {
    contents: data.contentIds.map(id => ({ content_id: id })),
    content_type: 'product',
    value: data.value,
    currency: data.currency,
  })
}

export function ttqTrackCompletePayment(data: {
  contentIds: string[]
  value: number
  currency: string
  orderId?: string
}) {
  getTtq()?.track?.('CompletePayment', {
    contents: data.contentIds.map(id => ({ content_id: id })),
    content_type: 'product',
    value: data.value,
    currency: data.currency,
  })
}
