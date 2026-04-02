import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

type ApiSuccessResponse<T> = {
  success: true
  data: T
}

type ApiErrorResponse = {
  success: false
  error: string
  code?: string
}

type DbLikeError = {
  code?: string
  detail?: string
  cause?: unknown
}

/**
 * Standard success response for API routes
 */
export function apiSuccess<T>(data: T, status = 200) {
  const body: ApiSuccessResponse<T> = { success: true, data }
  return NextResponse.json(body, { status })
}

/**
 * Standard error response for API routes
 */
export function apiError(error: string, status = 400, code?: string) {
  const body: ApiErrorResponse = { success: false, error, code }
  return NextResponse.json(body, { status })
}

function readDbCode(error: unknown): { code: string; detail?: string } | null {
  if (!error || typeof error !== 'object') return null

  const direct = error as DbLikeError
  if (typeof direct.code === 'string') {
    return { code: direct.code, detail: direct.detail }
  }

  const nested = direct.cause
  if (nested && typeof nested === 'object') {
    const cause = nested as DbLikeError
    if (typeof cause.code === 'string') {
      return { code: cause.code, detail: cause.detail }
    }
  }

  return null
}

function mapDbError(code: string, detail?: string) {
  if (code === '22003') {
    return apiError(
      'قيمة رقمية أكبر من الحد المسموح. راجع الأسعار أو الخصومات أو التكلفة.',
      422,
      'VALIDATION_ERROR'
    )
  }

  if (code === '22001') {
    return apiError('إحدى القيم النصية أطول من الحد المسموح.', 422, 'VALIDATION_ERROR')
  }

  if (code === '22P02') {
    return apiError('صيغة إحدى القيم غير صحيحة.', 422, 'VALIDATION_ERROR')
  }

  if (code === '23502') {
    return apiError('هناك حقل مطلوب غير مُدخل.', 422, 'VALIDATION_ERROR')
  }

  if (code === '23503') {
    return apiError('بيانات مرتبطة غير موجودة أو غير صالحة.', 422, 'VALIDATION_ERROR')
  }

  if (code === '23514') {
    return apiError('إحدى القيم لا تطابق شروط النظام.', 422, 'VALIDATION_ERROR')
  }

  if (code === '23505') {
    const lowered = (detail ?? '').toLowerCase()
    if (lowered.includes('slug')) {
      return apiError('هذا الرابط مستخدم بالفعل. اختر رابطا آخر.', 409, 'CONFLICT')
    }
    return apiError('هذه البيانات موجودة بالفعل ولا يمكن تكرارها.', 409, 'CONFLICT')
  }

  return null
}

/**
 * Convert runtime/db/validation exceptions to user-friendly API responses.
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(error.issues[0]?.message ?? 'بيانات غير صالحة', 422, 'VALIDATION_ERROR')
  }

  const db = readDbCode(error)
  if (db) {
    const mapped = mapDbError(db.code, db.detail)
    if (mapped) return mapped
  }

  return apiError('حدث خطأ داخلي في الخادم', 500, 'INTERNAL_ERROR')
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => apiError('غير مصرح', 401, 'UNAUTHORIZED'),
  forbidden: () => apiError('ممنوع الوصول', 403, 'FORBIDDEN'),
  notFound: (resource = 'المورد') =>
    apiError(`${resource} غير موجود`, 404, 'NOT_FOUND'),
  tooManyRequests: (message = 'تم تجاوز حد الطلبات. حاول لاحقاً.') =>
    apiError(message, 429, 'TOO_MANY_REQUESTS'),
  validation: (message: string) =>
    apiError(message, 422, 'VALIDATION_ERROR'),
  internal: (message = 'حدث خطأ داخلي في الخادم') =>
    apiError(message, 500, 'INTERNAL_ERROR'),
  storeNotFound: () =>
    apiError('المتجر غير موجود', 404, 'STORE_NOT_FOUND'),
} as const
