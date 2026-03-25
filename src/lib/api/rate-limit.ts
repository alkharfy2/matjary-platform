/**
 * Rate Limiter — حماية ضد الطلبات المتكررة
 *
 * في الذاكرة (In-Memory) — يعمل لـ single instance
 * للـ production مع عدة instances: استبدل بـ Upstash Redis أو Vercel KV
 *
 * يستخدم Sliding Window Counter algorithm
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  /** عدد الطلبات المسموحة في النافذة الزمنية */
  maxRequests: number
  /** مدة النافذة الزمنية بالثواني */
  windowSeconds: number
}

const store = new Map<string, RateLimitEntry>()

// تنظيف دوري للمدخلات المنتهية (كل 5 دقائق)
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)

  // لا يمنع إغلاق الـ process
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref()
  }
}

interface RateLimitResult {
  /** هل الطلب مسموح */
  allowed: boolean
  /** عدد الطلبات المتبقية */
  remaining: number
  /** متى يتم إعادة تعيين العداد (Unix timestamp بالثواني) */
  resetAt: number
}

/**
 * فحص rate limit لـ identifier محدد
 * @param identifier - مفتاح فريد (مثلاً IP + endpoint)
 * @param config - إعدادات الحد الأقصى
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  ensureCleanup()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = store.get(identifier)

  // إذا لا يوجد entry أو انتهت النافذة — ابدأ من جديد
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(identifier, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: Math.ceil(resetAt / 1000),
    }
  }

  // إذا لم يتجاوز الحد — زود العداد
  if (entry.count < config.maxRequests) {
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetAt: Math.ceil(entry.resetAt / 1000),
    }
  }

  // تجاوز الحد
  return {
    allowed: false,
    remaining: 0,
    resetAt: Math.ceil(entry.resetAt / 1000),
  }
}

/**
 * استخراج IP من الطلب
 * يعمل مع Vercel, Cloudflare, والـ proxies الشائعة
 */
export function getClientIp(request: Request): string {
  const headers = request.headers

  // Vercel / standard proxy
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }

  // Cloudflare
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // Real IP (nginx)
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp

  return 'unknown'
}

// ============================================
// Preset Configurations
// ============================================

/** إنشاء متجر — 5 طلبات / ساعة */
export const RATE_LIMIT_STORE_CREATE: RateLimitConfig = {
  maxRequests: 5,
  windowSeconds: 3600,
}

/** Checkout — 20 طلب / دقيقة */
export const RATE_LIMIT_CHECKOUT: RateLimitConfig = {
  maxRequests: 20,
  windowSeconds: 60,
}

/** التحقق من كوبون — 30 طلب / دقيقة */
export const RATE_LIMIT_COUPON_VALIDATE: RateLimitConfig = {
  maxRequests: 30,
  windowSeconds: 60,
}
