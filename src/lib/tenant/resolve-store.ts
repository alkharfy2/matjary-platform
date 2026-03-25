import { cache } from 'react'
import { db } from '@/db'
import { stores } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { StoreTheme, StoreSettings } from '@/db/schema'

export type ResolvedStore = {
  id: string
  merchantId: string
  slug: string
  name: string
  logoUrl: string | null
  isActive: boolean
  plan: string
  isPaid: boolean
  theme: StoreTheme
  settings: StoreSettings
}

interface ResolveStoreOptions {
  /** إذا true — يرجع المتاجر النشطة فقط. Default: false */
  activeOnly?: boolean
}

/**
 * Resolves a store by slug from the database.
 * Returns null if store not found.
 *
 * @param slug - The store slug (subdomain)
 * @param options.activeOnly - If true, only returns active stores (isActive=true).
 *   Default false so storefront layout can show "المتجر موقوف" for inactive stores.
 */
export const resolveStore = cache(async (
  slug: string,
  options: ResolveStoreOptions = {},
): Promise<ResolvedStore | null> => {
  try {
    const conditions = [eq(stores.slug, slug)]

    if (options.activeOnly) {
      conditions.push(eq(stores.isActive, true))
    }

    const result = await db
      .select({
        id: stores.id,
        merchantId: stores.merchantId,
        slug: stores.slug,
        name: stores.name,
        logoUrl: stores.logoUrl,
        isActive: stores.isActive,
        plan: stores.plan,
        isPaid: stores.isPaid,
        theme: stores.theme,
        settings: stores.settings,
      })
      .from(stores)
      .where(and(...conditions))
      .limit(1)

    const store = result[0]
    if (!store) return null

    return store as ResolvedStore
  } catch (error) {
    console.error(`[resolveStore] Failed to resolve store slug="${slug}":`, error)
    return null
  }
})
