import { headers } from 'next/headers'
import { resolveStore, type ResolvedStore } from '@/lib/tenant/resolve-store'

/**
 * Gets the current store from the x-store-slug header set by middleware.
 * Use this in Server Components inside (storefront) and (dashboard) layouts.
 * Returns null if no store slug header or store not found.
 */
export async function getCurrentStore(): Promise<ResolvedStore | null> {
  const headersList = await headers()
  const slug = headersList.get('x-store-slug')

  return slug ? resolveStore(slug) : null
}
