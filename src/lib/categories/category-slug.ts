const CATEGORY_SEGMENT_MAX_LENGTH = 100

const CATEGORY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Creates a URL-safe category slug from Arabic/English names.
 */
export function slugifyCategorySegment(value: string): string {
  const normalized = value.trim().toLowerCase().normalize('NFC')
  const slug = normalized
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CATEGORY_SEGMENT_MAX_LENGTH)

  return slug || 'category'
}

/**
 * Decode route segment safely. If decoding fails, returns original value.
 */
export function decodeCategorySegment(rawSegment: string): string {
  try {
    return decodeURIComponent(rawSegment).trim().normalize('NFC')
  } catch {
    return rawSegment.trim().normalize('NFC')
  }
}

export function buildCategorySlugSegment(id: string, slug: string): string {
  const normalizedSlug = slugifyCategorySegment(slug)
  return normalizedSlug ? `${id}-${normalizedSlug}` : id
}

export function parseCategorySlugSegment(segment: string): {
  categoryId: string | null
  slug: string
} {
  const normalized = segment.trim().normalize('NFC')
  const match = normalized.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:-(.+))?$/i
  )

  if (!match) {
    return {
      categoryId: null,
      slug: normalized,
    }
  }

  const id = match[1] ?? ''
  const slugPart = match[2] ?? ''

  return {
    categoryId: CATEGORY_ID_PATTERN.test(id) ? id : null,
    slug: slugPart || normalized,
  }
}
