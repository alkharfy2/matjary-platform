import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { db } from '@/db'
import { merchants, stores } from '@/db/schema'
import { eq, and, type InferSelectModel } from 'drizzle-orm'

type Merchant = InferSelectModel<typeof merchants>
type Store = InferSelectModel<typeof stores>

/**
 * Get the authenticated merchant from Clerk userId.
 * Use this in dashboard API routes.
 */
export async function getAuthenticatedMerchant() {
  const { userId } = await auth()
  if (!userId) return null

  const result = await db
    .select()
    .from(merchants)
    .where(eq(merchants.clerkUserId, userId))
    .limit(1)

  return result[0] ?? null
}

export type DashboardStoreAccessContext =
  | { status: 'ok'; merchant: Merchant; store: Store }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'missing_store_slug' }

/**
 * Resolve dashboard store access for web pages/actions.
 * This must be used for dashboard server components/actions where
 * relying on x-store-slug alone is not enough for tenant isolation.
 */
export async function getDashboardStoreAccessContext(
  options: { path?: string } = {}
): Promise<DashboardStoreAccessContext> {
  const { userId } = await auth()
  if (!userId) return { status: 'unauthenticated' }

  const headersList = await headers()
  
  const storeSlug = headersList.get('x-store-slug')
  if (!storeSlug) return { status: 'missing_store_slug' }

  const merchantResult = await db
    .select()
    .from(merchants)
    .where(eq(merchants.clerkUserId, userId))
    .limit(1)

  const merchant = merchantResult[0]
  if (!merchant) {
    console.warn('[dashboard-access] forbidden: merchant not found for user', {
      userId,
      storeSlug,
      path: options.path ?? 'unknown',
    })
    return { status: 'forbidden' }
  }

  const storeResult = await db
    .select()
    .from(stores)
    .where(and(eq(stores.slug, storeSlug), eq(stores.merchantId, merchant.id)))
    .limit(1)

  const store = storeResult[0]
  if (!store) {
    console.warn('[dashboard-access] forbidden store access attempt', {
      userId,
      merchantId: merchant.id,
      storeSlug,
      path: options.path ?? 'unknown',
    })
    return { status: 'forbidden' }
  }

  return { status: 'ok', merchant, store }
}

/**
 * Verify that the authenticated merchant owns the store
 * identified by the x-store-slug header.
 * Falls back to looking up the merchant's store if no slug header is set.
 * Use in dashboard API routes to prevent cross-tenant access.
 */
export async function verifyStoreOwnership() {
  const merchant = await getAuthenticatedMerchant()
  if (!merchant) return { merchant: null, store: null }

  const headersList = await headers()
  const slug = headersList.get('x-store-slug')

  let result
  if (slug) {
    // Verify the merchant owns this specific store (subdomain flow)
    result = await db
      .select()
      .from(stores)
      .where(and(eq(stores.slug, slug), eq(stores.merchantId, merchant.id)))
      .limit(1)
  } else {
    // No slug header — cannot determine which store. Return null for safety.
    return { merchant, store: null }
  }

  return { merchant, store: result[0] ?? null }
}

/**
 * Check if the current user is a super admin.
 * Supports multiple admin IDs via comma-separated SUPER_ADMIN_CLERK_ID.
 * Example: SUPER_ADMIN_CLERK_ID=user_abc,user_xyz
 */
export async function isSuperAdmin(): Promise<boolean> {
  const { userId } = await auth()
  if (!userId) return false

  const adminIds = process.env.SUPER_ADMIN_CLERK_ID
  if (!adminIds) return false

  const adminList = adminIds.split(',').map((id) => id.trim()).filter(Boolean)
  return adminList.includes(userId)
}
