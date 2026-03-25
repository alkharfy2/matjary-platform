const PRODUCT_SEGMENT_MAX_LENGTH = 200

const PRODUCT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Creates a URL-safe product slug from Arabic/English product names.
 */
export function slugifyProductName(value: string): string {
  const normalized = value.trim().toLowerCase().normalize('NFC')
  const slug = normalized
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PRODUCT_SEGMENT_MAX_LENGTH)

  return slug || 'product'
}

export function buildProductSlugSegment(id: string, slug: string): string {
  const normalizedSlug = slugifyProductName(slug)
  return normalizedSlug ? `${id}-${normalizedSlug}` : id
}

export function parseProductSlugSegment(segment: string): {
  productId: string | null
  slug: string
} {
  const normalized = segment.trim().normalize('NFC')
  const match = normalized.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-(.+))?$/i
  )

  if (!match) {
    return {
      productId: null,
      slug: normalized,
    }
  }

  const id = match[1] ?? ''
  const slugPart = match[2] ?? ''

  return {
    productId: PRODUCT_ID_PATTERN.test(id) ? id : null,
    slug: slugPart || normalized,
  }
}

