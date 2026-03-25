import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization: only connect when actually used (allows app to start without real keys)
let _supabase: SupabaseClient | null = null

function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    _supabase = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabase
}

// Keep backward-compatible reference
const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

const BUCKET_NAME = 'store-assets'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

type UploadResult = {
  url: string
  path: string
}

/**
 * Extract object path from a public/signed Supabase URL.
 * Returns null when the URL is not for the expected bucket.
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const marker = `/${BUCKET_NAME}/`
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) return null

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length)
    if (!encodedPath) return null

    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}

/**
 * Upload an image to Supabase Storage.
 * Path structure: {storeId}/{folder}/{filename}
 * This ensures store data isolation in storage too.
 */
export async function uploadImage(
  storeId: string,
  folder: 'products' | 'categories' | 'hero' | 'logo',
  file: File
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, WebP, GIF')
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الملف يتجاوز الحد الأقصى (5 ميجابايت)')
  }

  // Generate unique filename
  const extension = file.name.split('.').pop() || 'jpg'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const path = `${storeId}/${folder}/${uniqueName}`

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`فشل رفع الصورة: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    path,
  }
}

/**
 * Delete an image from Supabase Storage.
 * يتحقق أن المسار يبدأ بـ storeId لمنع حذف ملفات متجر آخر.
 */
export async function deleteImage(path: string, storeId?: string): Promise<void> {
  // Defense-in-depth: التحقق أن المسار ينتمي للمتجر
  if (storeId && !path.startsWith(`${storeId}/`)) {
    throw new Error('غير مسموح بحذف ملفات لا تنتمي للمتجر')
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    throw new Error(`فشل حذف الصورة: ${error.message}`)
  }
}

/**
 * Deletes multiple paths without failing the caller when one path fails.
 * Returns number of successful and failed deletions.
 */
export async function deleteImagesBestEffort(paths: string[]) {
  if (!paths.length) return { deleted: 0, failed: 0 }

  const results = await Promise.allSettled(
    paths.map(async (path) => {
      await deleteImage(path)
      return path
    })
  )

  const deleted = results.filter((result) => result.status === 'fulfilled').length
  const failed = results.length - deleted

  return { deleted, failed }
}

/**
 * Delete all images under a specific store/folder path.
 */
export async function deleteStoreFolder(
  storeId: string,
  folder?: string
): Promise<void> {
  const prefix = folder ? `${storeId}/${folder}` : storeId
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix)

  if (listError || !files?.length) return

  const paths = files.map((f) => `${prefix}/${f.name}`)
  await supabase.storage.from(BUCKET_NAME).remove(paths)
}
