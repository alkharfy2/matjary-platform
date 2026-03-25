import { db } from '@/db'
import { storeOrders } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import { getConfiguredRootDomain, hasUsableRootDomain } from '@/lib/tenant/urls'

// ============================================
// Kashier Payment Gateway — Helper Functions
// ============================================

const getConfig = () => {
  const merchantId = process.env.KASHIER_MERCHANT_ID
  const apiKey = process.env.KASHIER_API_KEY
  // Secret key contains a '$' which dotenv-expand corrupts, so we store it in two parts
  const secretPart1 = process.env.KASHIER_API_SECRET_PART1
  const secretPart2 = process.env.KASHIER_API_SECRET_PART2
  const mode = process.env.KASHIER_MODE ?? 'test'

  if (!merchantId || !apiKey || !secretPart1 || !secretPart2) {
    throw new Error('متغيرات Kashier البيئية غير مكتملة')
  }

  const apiSecret = `${secretPart1}$${secretPart2}`

  const apiBaseUrl =
    mode === 'live'
      ? 'https://api.kashier.io'
      : 'https://test-api.kashier.io'

  const paymentBaseUrl = 'https://payments.kashier.io'

  return { merchantId, apiKey, apiSecret, mode, apiBaseUrl, paymentBaseUrl }
}

// ============================================
// Types
// ============================================

interface CreateSessionParams {
  orderId: string
  orderNumber: string
  amount: string
  currency: string
  customerName: string
  customerEmail?: string | null
  storeId: string
}

interface KashierSessionResponse {
  _id: string
  status: string
  merchantId: string
  paymentParams: {
    amount: string
    currency: string
    order: string
  }
}

interface KashierWebhookPayload {
  merchantOrderId: string
  orderId: string
  amount: string
  currency: string
  paymentStatus: string
  method: string
  transactionId: string
  signature: string
  sessionId?: string
}

// ============================================
// Create Payment Session
// ============================================

/**
 * إنشاء جلسة دفع عبر Kashier Payment Sessions API v3
 * يُنشئ جلسة ويرجع رابط الدفع لتحويل العميل
 */
export async function createKashierSession(
  params: CreateSessionParams,
): Promise<{ sessionId: string; redirectUrl: string }> {
  const { orderId, orderNumber, amount, currency, customerName, storeId } = params
  const config = getConfig()

  // Kashier rejects localhost URLs — use a placeholder in dev, real domain in prod
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectBase = appUrl.includes('localhost')
    ? 'https://placeholder.example.com'
    : appUrl
  const merchantRedirect = `${redirectBase}/store/order-success?orderId=${orderId}`
  const serverWebhook = `${appUrl}/api/payments/kashier/webhook`

  // جلسة تنتهي بعد 30 دقيقة
  const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const body: Record<string, unknown> = {
    expireAt,
    maxFailureAttempts: 3,
    paymentType: 'credit',
    amount,
    currency,
    order: orderNumber,
    merchantId: config.merchantId,
    merchantRedirect,
    serverWebhook,
    display: 'ar',
    type: 'external',
    allowedMethods: 'card,wallet',
    failureRedirect: 'true',
    customer: {
      email: params.customerEmail ?? `${orderNumber}@guest.local`,
      reference: orderId,
    },
    metaData: {
      orderId,
      storeId,
      customerName,
    },
  }

  const response = await fetch(`${config.apiBaseUrl}/v3/payment/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': config.apiSecret,
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Kashier session creation failed:', {
      status: response.status,
      body: errorBody,
    })
    throw new Error('فشل في إنشاء جلسة الدفع')
  }

  const data = (await response.json()) as KashierSessionResponse
  const sessionId = data._id
  const redirectUrl = `${config.paymentBaseUrl}/session/${sessionId}?mode=${config.mode}`

  // حفظ kashierOrderId على الطلب
  await db
    .update(storeOrders)
    .set({ kashierOrderId: sessionId })
    .where(and(eq(storeOrders.id, orderId), eq(storeOrders.storeId, storeId)))

  return { sessionId, redirectUrl }
}

// ============================================
// Create Subscription Payment Session
// ============================================

interface CreateSubscriptionSessionParams {
  storeId: string
  storeSlug: string
  amount: string
  currency: string
  merchantEmail: string
}

/**
 * إنشاء جلسة دفع اشتراك عبر Kashier
 * تختلف عن جلسة دفع الطلب: الـ redirect والـ webhook مختلفين
 */
export async function createSubscriptionSession(
  params: CreateSubscriptionSessionParams,
): Promise<{ sessionId: string; redirectUrl: string }> {
  const { storeId, storeSlug, amount, currency, merchantEmail } = params
  const config = getConfig()

  // بناء الـ redirect URL — Kashier بيرفض localhost
  const rootDomain = getConfiguredRootDomain()
  const protocol = process.env.NEXT_PUBLIC_PROTOCOL?.trim().replace(/:$/, '') || 'https'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  let redirectBase: string
  let webhookBase: string
  if (hasUsableRootDomain(rootDomain)) {
    // بيئة production — root domain حقيقي
    redirectBase = `${protocol}://${rootDomain}`
    webhookBase = `${protocol}://${rootDomain}`
  } else if (!appUrl.includes('localhost')) {
    // Vercel / staging — مفيش root domain بس الـ appUrl شغال
    redirectBase = appUrl
    webhookBase = appUrl
  } else {
    // بيئة تطوير — Kashier بيرفض localhost للـ redirect
    redirectBase = 'https://placeholder.example.com'
    webhookBase = appUrl
  }

  const merchantOrderId = `sub_${storeId}_${Date.now()}`
  const merchantRedirect = `${redirectBase}/subscription-result?storeId=${storeId}`
  const serverWebhook = `${webhookBase}/api/payments/subscription/webhook`

  const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const body: Record<string, unknown> = {
    expireAt,
    maxFailureAttempts: 3,
    paymentType: 'credit',
    amount,
    currency,
    order: merchantOrderId,
    merchantId: config.merchantId,
    merchantRedirect,
    serverWebhook,
    display: 'ar',
    type: 'external',
    allowedMethods: 'card,wallet',
    failureRedirect: 'true',
    customer: {
      email: merchantEmail,
      reference: storeId,
    },
    metaData: {
      storeId,
      storeSlug,
      type: 'subscription',
    },
  }

  const response = await fetch(`${config.apiBaseUrl}/v3/payment/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': config.apiSecret,
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Kashier subscription session creation failed:', {
      status: response.status,
      body: errorBody,
    })
    throw new Error('فشل في إنشاء جلسة دفع الاشتراك')
  }

  const data = (await response.json()) as KashierSessionResponse
  const sessionId = data._id
  const redirectUrl = `${config.paymentBaseUrl}/session/${sessionId}?mode=${config.mode}`

  return { sessionId, redirectUrl }
}

// ============================================
// Create Wallet Top-Up Session
// ============================================

interface CreateWalletSessionParams {
  merchantId: string
  storeId: string
  storeSlug: string
  amount: string
  currency: string
  merchantEmail: string
}

/**
 * إنشاء جلسة شحن محفظة عبر Kashier
 * merchantOrderId يبدأ بـ wallet_ لتمييزه عن طلبات المتجر والاشتراك
 */
export async function createWalletSession(
  params: CreateWalletSessionParams,
): Promise<{ sessionId: string; redirectUrl: string }> {
  const { merchantId, storeId, storeSlug, amount, currency, merchantEmail } = params
  const config = getConfig()

  const rootDomain = getConfiguredRootDomain()
  const protocol = process.env.NEXT_PUBLIC_PROTOCOL?.trim().replace(/:$/, '') || 'https'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  let redirectBase: string
  let webhookBase: string
  if (hasUsableRootDomain(rootDomain)) {
    redirectBase = `${protocol}://${rootDomain}`
    webhookBase = `${protocol}://${rootDomain}`
  } else if (!appUrl.includes('localhost')) {
    redirectBase = appUrl
    webhookBase = appUrl
  } else {
    redirectBase = 'https://placeholder.example.com'
    webhookBase = appUrl
  }

  const merchantOrderId = `wallet_${merchantId}_${Date.now()}`
  const merchantRedirect = `${redirectBase}/wallet-result?storeId=${storeId}`
  const serverWebhook = `${webhookBase}/api/payments/wallet/webhook`

  const expireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

  const body: Record<string, unknown> = {
    expireAt,
    maxFailureAttempts: 3,
    paymentType: 'credit',
    amount,
    currency,
    order: merchantOrderId,
    merchantId: config.merchantId,
    merchantRedirect,
    serverWebhook,
    display: 'ar',
    type: 'external',
    allowedMethods: 'card,wallet',
    failureRedirect: 'true',
    customer: {
      email: merchantEmail,
      reference: merchantId,
    },
    metaData: {
      merchantId,
      storeId,
      storeSlug,
      type: 'wallet_top_up',
    },
  }

  const response = await fetch(`${config.apiBaseUrl}/v3/payment/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': config.apiSecret,
      'api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Kashier wallet session creation failed:', {
      status: response.status,
      body: errorBody,
    })
    throw new Error('فشل في إنشاء جلسة شحن المحفظة')
  }

  const data = (await response.json()) as KashierSessionResponse
  const sessionId = data._id
  const redirectUrl = `${config.paymentBaseUrl}/session/${sessionId}?mode=${config.mode}`

  return { sessionId, redirectUrl }
}

// ============================================
// Verify Webhook Signature
// ============================================

/**
 * التحقق من توقيع Kashier webhook
 * يستخدم HMAC-SHA256 مع API Key
 * الـ hash string: merchantOrderId + orderId + amount + currency + paymentStatus
 */
export function verifyKashierSignature(
  payload: KashierWebhookPayload,
): boolean {
  const config = getConfig()

  const hashString = [
    payload.merchantOrderId,
    payload.orderId,
    payload.amount,
    payload.currency,
    payload.paymentStatus,
  ].join('')

  const expectedSignature = crypto
    .createHmac('sha256', config.apiKey)
    .update(hashString)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(payload.signature),
      Buffer.from(expectedSignature),
    )
  } catch {
    // timingSafeEqual throws if buffer lengths don't match
    return false
  }
}

// ============================================
// Exports
// ============================================




export type { CreateSessionParams, KashierWebhookPayload, KashierSessionResponse }
