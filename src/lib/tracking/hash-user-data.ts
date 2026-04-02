import 'server-only'
import { createHash } from 'crypto'

/**
 * SHA-256 hash لبيانات المستخدم المطلوبة في Facebook CAPI
 * كل القيم لازم تكون lowercase + trimmed قبل الهاش
 * الهاتف لازم يكون بالصيغة الدولية بدون + أو مسافات
 */
export function hashForCAPI(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
}

/**
 * تنسيق رقم الهاتف للـ CAPI
 * يحول أي صيغة لـ الصيغة الدولية (مثال: 01012345678 → 201012345678)
 */
export function formatPhoneForCAPI(phone: string, countryCode = '20'): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    return countryCode + digits.slice(1)
  }

  if (digits.startsWith(countryCode)) {
    return digits
  }

  return countryCode + digits
}

/**
 * بناء user_data object كامل ومهاش لـ CAPI
 */
export function buildCAPIUserData(data: {
  email?: string | null
  phone?: string | null
  firstName?: string | null
  city?: string | null
  country?: string | null
  clientIpAddress?: string | null
  clientUserAgent?: string | null
  fbc?: string | null
  fbp?: string | null
}): Record<string, unknown> {
  const userData: Record<string, unknown> = {}

  if (data.email) userData.em = [hashForCAPI(data.email)]
  if (data.phone) userData.ph = [hashForCAPI(formatPhoneForCAPI(data.phone))]
  if (data.firstName) userData.fn = [hashForCAPI(data.firstName)]
  if (data.city) userData.ct = [hashForCAPI(data.city)]
  if (data.country) userData.country = [hashForCAPI(data.country)]
  if (data.clientIpAddress) userData.client_ip_address = data.clientIpAddress
  if (data.clientUserAgent) userData.client_user_agent = data.clientUserAgent
  if (data.fbc) userData.fbc = data.fbc
  if (data.fbp) userData.fbp = data.fbp

  return userData
}
