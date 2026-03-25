import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { storeCategories } from '@/db/schema'

const CATEGORY_SLUG_MAX_LENGTH = 100
const CATEGORY_SLUG_FALLBACK = 'category'

export function slugifyCategoryName(value: string): string {
  const normalized = value.trim().toLowerCase().normalize('NFC')
  const slug = normalized
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CATEGORY_SLUG_MAX_LENGTH)

  return slug || CATEGORY_SLUG_FALLBACK
}

function buildSlugWithSuffix(baseSlug: string, counter: number): string {
  const suffix = `-${counter}`
  const maxBaseLength = CATEGORY_SLUG_MAX_LENGTH - suffix.length
  const trimmedBase = baseSlug
    .slice(0, Math.max(1, maxBaseLength))
    .replace(/-+$/g, '')

  return `${trimmedBase || CATEGORY_SLUG_FALLBACK}${suffix}`
}

export async function resolveUniqueCategorySlug(
  storeId: string,
  categoryName: string,
  options?: { excludeCategoryId?: string }
): Promise<string> {
  const baseSlug = slugifyCategoryName(categoryName)
  let candidate = baseSlug
  let counter = 2

  while (true) {
    const conditions = [
      eq(storeCategories.storeId, storeId),
      eq(storeCategories.slug, candidate),
    ]

    if (options?.excludeCategoryId) {
      conditions.push(ne(storeCategories.id, options.excludeCategoryId))
    }

    const existing = await db
      .select({ id: storeCategories.id })
      .from(storeCategories)
      .where(and(...conditions))
      .limit(1)

    if (!existing[0]) {
      return candidate
    }

    candidate = buildSlugWithSuffix(baseSlug, counter)
    counter += 1
  }
}
