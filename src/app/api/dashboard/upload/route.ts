import { NextRequest } from 'next/server'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { uploadImage } from '@/lib/supabase/storage'
import { z } from 'zod'

const ALLOWED_FOLDERS = ['products', 'categories', 'hero', 'logo'] as const

const uploadMetaSchema = z.object({
  folder: z.enum(ALLOWED_FOLDERS, { error: 'مجلد غير صالح' }).default('products'),
})

/**
 * POST /api/dashboard/upload — رفع صورة
 * Accepts FormData with: file (File), folder (string)
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const formData = await request.formData()
    const file = formData.get('file')
    const rawFolder = formData.get('folder') as string | null

    if (!(file instanceof File) || file.size === 0) {
      return ApiErrors.validation('يجب اختيار ملف')
    }

    const parsed = uploadMetaSchema.safeParse({ folder: rawFolder ?? 'products' })
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'مجلد غير صالح')
    }

    const { folder } = parsed.data

    const result = await uploadImage(store.id, folder, file)

    return apiSuccess(result, 201)
  } catch (error) {
    console.error('Error uploading image:', error)

    // Do not leak internal/server details to UI (e.g. SQL errors).
    if (error instanceof Error) {
      return apiError('تعذر رفع الصورة الآن. حاول مرة أخرى.', 422, 'UPLOAD_FAILED')
    }

    return handleApiError(error)
  }
}


