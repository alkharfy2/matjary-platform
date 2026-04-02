'use server'

import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import {
  updateStoreSchema,
  updateStoreSettingsSchema,
  socialLinksSchema,
} from '@/lib/validations/store'

export async function saveSettings(body: Record<string, unknown>) {
  const ctx = await getDashboardStoreAccessContext()
  if (ctx.status !== 'ok') {
    return { success: false, error: 'غير مصرح' }
  }

  const store = ctx.store
  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  const basicFields = [
    'name', 'description', 'contactEmail', 'contactPhone',
    'contactWhatsapp', 'address', 'metaTitle', 'metaDescription',
  ] as const

  const hasBasicFields = basicFields.some((field) => field in body)

  if (hasBasicFields) {
    const basicParsed = updateStoreSchema.safeParse(body)
    if (!basicParsed.success) {
      return { success: false, error: basicParsed.error.issues[0]?.message ?? 'بيانات غير صالحة' }
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

  if (body.settings !== undefined) {
    const settingsParsed = updateStoreSettingsSchema.safeParse(body.settings)
    if (!settingsParsed.success) {
      return { success: false, error: settingsParsed.error.issues[0]?.message ?? 'إعدادات غير صالحة' }
    }
    updateData.settings = { ...store.settings, ...settingsParsed.data }
  }

  if (body.socialLinks !== undefined) {
    const socialParsed = socialLinksSchema.safeParse(body.socialLinks)
    if (!socialParsed.success) {
      return { success: false, error: 'روابط التواصل غير صالحة' }
    }
    updateData.socialLinks = socialParsed.data
  }

  if (Object.keys(updateData).length === 1) {
    return { success: false, error: 'لا توجد بيانات للتحديث' }
  }

  try {
    await db.update(stores).set(updateData).where(eq(stores.id, store.id))
    return { success: true }
  } catch (error) {
    console.error('Error saving settings:', error)
    return { success: false, error: 'تعذر حفظ الإعدادات' }
  }
}
