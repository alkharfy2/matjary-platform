/**
 * Google Analytics 4 — Client-Side Tracking
 *
 * يستخدم gtag() global function.
 * المرجع: https://developers.google.com/analytics/devguides/collection/ga4
 */

function getGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    return window.gtag
  }
  return null
}

export function gaTrackViewItem(data: {
  itemId: string
  itemName: string
  price: number
  currency: string
  category?: string
}) {
  getGtag()?.('event', 'view_item', {
    currency: data.currency,
    value: data.price,
    items: [{
      item_id: data.itemId,
      item_name: data.itemName,
      price: data.price,
      item_category: data.category,
    }],
  })
}

export function gaTrackAddToCart(data: {
  itemId: string
  itemName: string
  price: number
  currency: string
  quantity: number
}) {
  getGtag()?.('event', 'add_to_cart', {
    currency: data.currency,
    value: data.price * data.quantity,
    items: [{
      item_id: data.itemId,
      item_name: data.itemName,
      price: data.price,
      quantity: data.quantity,
    }],
  })
}

export function gaTrackBeginCheckout(data: {
  value: number
  currency: string
  items: Array<{ id: string; name: string; price: number; quantity: number }>
}) {
  getGtag()?.('event', 'begin_checkout', {
    currency: data.currency,
    value: data.value,
    items: data.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

export function gaTrackPurchase(data: {
  transactionId: string
  value: number
  currency: string
  items: Array<{ id: string; name: string; price: number; quantity: number }>
}) {
  getGtag()?.('event', 'purchase', {
    transaction_id: data.transactionId,
    currency: data.currency,
    value: data.value,
    items: data.items.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

export function gaTrackSearch(searchTerm: string) {
  getGtag()?.('event', 'search', { search_term: searchTerm })
}
