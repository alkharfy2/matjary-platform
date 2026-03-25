import { NextRequest } from 'next/server'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import {
  updateStoreSchema,
  updateStoreSettingsSchema,
  socialLinksSchema,
} from '@/lib/validations/store'

/**
 * GET /api/dashboard/settings — إعدادات المتجر الكاملة
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    // Get full store data
    const fullStore = await db
      .select()
      .from(stores)
      .where(eq(stores.id, store.id))
      .limit(1)

    if (!fullStore[0]) return ApiErrors.storeNotFound()

    return apiSuccess(fullStore[0])
  } catch (error) {
    console.error('Error fetching settings:', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/settings — تحديث إعدادات المتجر
 */
export async function PUT(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    const basicFields = [
      'name',
      'description',
      'contactEmail',
      'contactPhone',
      'contactWhatsapp',
      'address',
      'metaTitle',
      'metaDescription',
    ] as const

    const hasBasicFields = basicFields.some((field) => field in body)

    // Validate and apply basic store info via Zod
    if (hasBasicFields) {
      const basicParsed = updateStoreSchema.safeParse(body)
      if (!basicParsed.success) {
        return ApiErrors.validation(basicParsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
      }

      const d = basicParsed.data
      if (d.name !== undefined) updateData.name = d.name
      if (d.description !== undefined) updateData.description = d.description
      if (d.contactEmail !== undefined) updateData.contactEmail = d.contactEmail
      if (d.contactPhone !== undefined) updateData.contactPhone = d.contactPhone
      if (d.contactWhatsapp !== undefined) updateData.contactWhatsapp = d.contactWhatsapp
      if (d.address !== undefined) updateData.address = d.address
      if (d.metaTitle !== undefined) updateData.metaTitle = d.metaTitle
      if (d.metaDescription !== undefined) updateData.metaDescription = d.metaDescription
    }

    // Validate URL fields separately
    if (body.logoUrl !== undefined) {
      if (body.logoUrl !== null && typeof body.logoUrl === 'string' && body.logoUrl.length > 0) {
        try {
          new URL(body.logoUrl)
          updateData.logoUrl = body.logoUrl
        } catch {
          return ApiErrors.validation('رابط الشعار غير صالح')
        }
      } else {
        updateData.logoUrl = null
      }
    }

    if (body.faviconUrl !== undefined) {
      if (body.faviconUrl !== null && typeof body.faviconUrl === 'string' && body.faviconUrl.length > 0) {
        try {
          new URL(body.faviconUrl)
          updateData.faviconUrl = body.faviconUrl
        } catch {
          return ApiErrors.validation('رابط الأيقونة غير صالح')
        }
      } else {
        updateData.faviconUrl = null
      }
    }

    // Validate settings if provided
    if (body.settings !== undefined) {
      const settingsParsed = updateStoreSettingsSchema.safeParse(body.settings)
      if (!settingsParsed.success) {
        return ApiErrors.validation(settingsParsed.error.issues[0]?.message ?? 'إعدادات غير صالحة')
      }

      // Merge with existing
      updateData.settings = { ...store.settings, ...settingsParsed.data }
    }

    // Validate social links if provided
    if (body.socialLinks !== undefined) {
      const socialParsed = socialLinksSchema.safeParse(body.socialLinks)
      if (!socialParsed.success) {
        return ApiErrors.validation('روابط التواصل غير صالحة')
      }
      updateData.socialLinks = socialParsed.data
    }

    if (Object.keys(updateData).length === 1) {
      return ApiErrors.validation('لا توجد بيانات للتحديث')
    }

    const updated = await db
      .update(stores)
      .set(updateData)
      .where(eq(stores.id, store.id))
      .returning()

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('Error updating settings:', error)
    return handleApiError(error)
  }
}
