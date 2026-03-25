const LOCAL_ROOT_DOMAIN_PATTERN = /(^|\.)(localhost|127\.0\.0\.1|matjary\.local)(:\d+)?$/i
const STORE_SLUG_PATTERN = /^[a-z0-9-]{3,30}$/

function getProtocol(): string {
  const protocol = process.env.NEXT_PUBLIC_PROTOCOL?.trim().replace(/:$/, '')
  return protocol || 'https'
}

export function getConfiguredRootDomain(): string | null {
  const raw = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
  if (!raw) return null

  return raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

export function hasUsableRootDomain(rootDomain = getConfiguredRootDomain()): rootDomain is string {
  return Boolean(rootDomain && !LOCAL_ROOT_DOMAIN_PATTERN.test(rootDomain))
}

export function normalizeStoreSlug(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return STORE_SLUG_PATTERN.test(normalized) ? normalized : null
}

export function buildTenantDashboardHref(
  slug: string,
  options?: { origin?: string }
): string {
  const rootDomain = getConfiguredRootDomain()
  if (hasUsableRootDomain(rootDomain)) {
    return `${getProtocol()}://${slug}.${rootDomain}/dashboard`
  }

  const encodedSlug = encodeURIComponent(slug)
  if (options?.origin) {
    return `${options.origin}/dashboard?store=${encodedSlug}`
  }
  return `/dashboard?store=${encodedSlug}`
}

export function buildTenantStorefrontHref(
  slug: string,
  options?: { origin?: string }
): string {
  const rootDomain = getConfiguredRootDomain()
  if (hasUsableRootDomain(rootDomain)) {
    return `${getProtocol()}://${slug}.${rootDomain}`
  }

  const encodedSlug = encodeURIComponent(slug)
  if (options?.origin) {
    return `${options.origin}/store?store=${encodedSlug}`
  }
  return `/store?store=${encodedSlug}`
}

export function getRootOrigin(fallbackOrigin: string): string {
  const rootDomain = getConfiguredRootDomain()
  if (hasUsableRootDomain(rootDomain)) {
    return `${getProtocol()}://${rootDomain}`
  }
  return fallbackOrigin
}
