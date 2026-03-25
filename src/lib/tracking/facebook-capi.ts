/**
 * Facebook Conversion API — Server-Side Events
 *
 * يُستدعى من API Routes (checkout webhook, order creation, إلخ).
 * لا يحتاج أي حزمة إضافية — يستخدم fetch() مباشرة.
 *
 * المرجع: https://developers.facebook.com/docs/marketing-api/conversions-api/using-the-api
 * Graph API Version: v21.0
 */

import { createHash } from 'crypto'

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_API_BASE = 'https://graph.facebook.com'

/** هاش SHA-256 — مطلوب لبيانات المستخدم */
function sha256(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
}

type CAPIEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Search'

type CAPIUserData = {
  email?: string
  phone?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string
  fbp?: string
}

type CAPICustomData = {
  currency?: string
  value?: number
  contentIds?: string[]
  contentType?: 'product' | 'product_group'
  contentName?: string
  contentCategory?: string
  numItems?: number
  orderId?: string
  searchString?: string
}

type CAPIConfig = {
  pixelId: string
  accessToken: string
  testEventCode?: string | null
}

/**
 * إرسال حدث واحد إلى Facebook Conversion API
 */
export async function sendConversionEvent(
  config: CAPIConfig,
  event: CAPIEventName,
  userData: CAPIUserData,
  customData: CAPICustomData,
  eventSourceUrl: string,
  eventId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${config.pixelId}/events`

    // بناء user_data مع الهاش
    const hashedUserData: Record<string, unknown> = {}
    if (userData.email) hashedUserData.em = [sha256(userData.email)]
    if (userData.phone) hashedUserData.ph = [sha256(userData.phone)]
    if (userData.clientIpAddress) hashedUserData.client_ip_address = userData.clientIpAddress
    if (userData.clientUserAgent) hashedUserData.client_user_agent = userData.clientUserAgent
    if (userData.fbc) hashedUserData.fbc = userData.fbc
    if (userData.fbp) hashedUserData.fbp = userData.fbp

    // بناء custom_data
    const custom: Record<string, unknown> = {}
    if (customData.currency) custom.currency = customData.currency
    if (customData.value !== undefined) custom.value = customData.value
    if (customData.contentIds) custom.content_ids = customData.contentIds
    if (customData.contentType) custom.content_type = customData.contentType
    if (customData.contentName) custom.content_name = customData.contentName
    if (customData.contentCategory) custom.content_category = customData.contentCategory
    if (customData.numItems) custom.num_items = customData.numItems
    if (customData.orderId) custom.order_id = customData.orderId
    if (customData.searchString) custom.search_string = customData.searchString

    const body: Record<string, unknown> = {
      data: [
        {
          event_name: event,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: eventSourceUrl,
          user_data: hashedUserData,
          custom_data: custom,
          ...(eventId && { event_id: eventId }),
        },
      ],
    }

    // إضافة test_event_code لو موجود (للاختبار فقط)
    if (config.testEventCode) {
      body.test_event_code = config.testEventCode
    }

    const response = await fetch(`${url}?access_token=${config.accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[CAPI] Error:', JSON.stringify(errorData))
      return { success: false, error: `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (error) {
    console.error('[CAPI] Exception:', error)
    return { success: false, error: String(error) }
  }
}
