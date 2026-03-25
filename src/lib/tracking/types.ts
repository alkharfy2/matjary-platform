/** معرّفات الـ Tracking لكل متجر — تُقرأ من store.settings */
export type TrackingConfig = {
  facebookPixelId: string | null
  facebookConversionApiToken: string | null
  facebookTestEventCode: string | null
  tiktokPixelId: string | null
  googleAnalyticsId: string | null
  snapchatPixelId: string | null
}

/** بيانات حدث e-commerce موحدة */
export type EcommerceEventData = {
  contentIds?: string[]
  contentName?: string
  contentCategory?: string
  contentType?: 'product' | 'product_group'
  currency?: string
  value?: number
  numItems?: number
  searchString?: string
  orderId?: string
  items?: Array<{
    id: string
    name: string
    price: number
    quantity: number
    category?: string
  }>
}

/** بيانات المستخدم للـ Conversion API (server-side) */
export type ConversionUserData = {
  email?: string
  phone?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string
  fbp?: string
}
