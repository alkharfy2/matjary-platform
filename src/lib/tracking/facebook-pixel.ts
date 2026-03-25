/**
 * Facebook Pixel — Client-Side Tracking
 *
 * يُستدعى فقط في client components أو في <Script> tags.
 * يستخدم fbq() global function اللي بيحملها الـ base code.
 *
 * المرجع: https://developers.facebook.com/docs/meta-pixel/reference
 */

/** التحقق إن fbq موجود في window */
function getFbq(): ((...args: unknown[]) => void) | null {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    return window.fbq
  }
  return null
}

/** تتبع حدث PageView — يتفعل تلقائياً في الـ base code */
export function trackPageView() {
  getFbq()?.('track', 'PageView')
}

/** تتبع مشاهدة منتج */
export function trackViewContent(data: {
  contentId: string
  contentName: string
  contentCategory?: string
  value: number
  currency: string
}) {
  getFbq()?.('track', 'ViewContent', {
    content_ids: [data.contentId],
    content_name: data.contentName,
    content_category: data.contentCategory,
    content_type: 'product',
    value: data.value,
    currency: data.currency,
  })
}

/** تتبع إضافة للسلة */
export function trackAddToCart(data: {
  contentId: string
  contentName: string
  value: number
  currency: string
  quantity?: number
}) {
  getFbq()?.('track', 'AddToCart', {
    content_ids: [data.contentId],
    content_name: data.contentName,
    content_type: 'product',
    value: data.value,
    currency: data.currency,
    ...(data.quantity && { num_items: data.quantity }),
  })
}

/** تتبع بدء Checkout */
export function trackInitiateCheckout(data: {
  contentIds: string[]
  value: number
  currency: string
  numItems: number
}) {
  getFbq()?.('track', 'InitiateCheckout', {
    content_ids: data.contentIds,
    content_type: 'product',
    value: data.value,
    currency: data.currency,
    num_items: data.numItems,
  })
}

/** تتبع شراء ناجح */
export function trackPurchase(data: {
  contentIds: string[]
  value: number
  currency: string
  numItems: number
  orderId?: string
}) {
  getFbq()?.('track', 'Purchase', {
    content_ids: data.contentIds,
    content_type: 'product',
    value: data.value,
    currency: data.currency,
    num_items: data.numItems,
    ...(data.orderId && { order_id: data.orderId }),
  })
}

/** تتبع بحث */
export function trackSearch(searchString: string) {
  getFbq()?.('track', 'Search', {
    search_string: searchString,
  })
}
