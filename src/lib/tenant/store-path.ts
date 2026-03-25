import { hasUsableRootDomain } from '@/lib/tenant/urls'

type StorePathQueryValue = string | number | boolean | null | undefined

type StorePathOptions = {
  storeSlug?: string | null
  query?: Record<string, StorePathQueryValue>
}

/**
 * Build storefront-relative paths that work in both:
 * - local/preview mode (no wildcard subdomain): keep /store prefix
 * - custom-domain subdomain mode: strip /store prefix
 */
export function storePath(path: `/${string}`, options: StorePathOptions = {}): string {
  const url = new URL(path, 'https://matjary.local')
  const hasPrefix = url.pathname === '/store' || url.pathname.startsWith('/store/')
  const shouldUseStorePrefix =
    process.env.NODE_ENV === 'development' || !hasUsableRootDomain()

  if (shouldUseStorePrefix) {
    url.pathname = hasPrefix ? url.pathname : `/store${url.pathname}`
  } else if (hasPrefix) {
    url.pathname = url.pathname.replace(/^\/store/, '') || '/'
  }

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === null || value === undefined) continue
      url.searchParams.set(key, String(value))
    }
  }

  if (options.storeSlug) {
    url.searchParams.set('store', options.storeSlug)
  }

  return `${url.pathname}${url.search}${url.hash}`
}
