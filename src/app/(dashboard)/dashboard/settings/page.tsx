import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import SettingsClient from './_components/settings-client'
import type { SettingsInitialData } from './_components/settings-client'

export default async function SettingsPage() {
  const store = await getCurrentStore()
  if (!store) return notFound()

  // Load full store record for settings form
  const [fullStore] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, store.id))
    .limit(1)

  if (!fullStore) return notFound()

  const initialData: SettingsInitialData = {
    name: fullStore.name,
    description: fullStore.description,
    contactEmail: fullStore.contactEmail,
    contactPhone: fullStore.contactPhone,
    contactWhatsapp: fullStore.contactWhatsapp,
    settings: (fullStore.settings ?? {}) as unknown as SettingsInitialData['settings'],
    socialLinks: (fullStore.socialLinks ?? null) as unknown as SettingsInitialData['socialLinks'],
  }

  return <SettingsClient initialData={initialData} />
}
