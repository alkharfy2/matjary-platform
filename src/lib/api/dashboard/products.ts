import { and, eq, ne } from 'drizzle-orm'
import { db } from '@/db'
import { storeCategories, storeProducts } from '@/db/schema'
import { slugifyProductName } from '@/lib/products/product-slug'

export async function categoryBelongsToStore(storeId: string, categoryId: string) {
  const category = await db
    .select({ id: storeCategories.id })
    .from(storeCategories)
    .where(
      and(
        eq(storeCategories.id, categoryId),
        eq(storeCategories.storeId, storeId)
      )
    )
    .limit(1)

  return Boolean(category[0])
}

const PRODUCT_SLUG_MAX_LENGTH = 200

function buildSlugWithSuffix(baseSlug: string, counter: number): string {
  const suffix = `-${counter}`
  const maxBaseLength = PRODUCT_SLUG_MAX_LENGTH - suffix.length
  const trimmedBase = baseSlug
    .slice(0, Math.max(1, maxBaseLength))
    .replace(/-+$/g, '')

  return `${trimmedBase || 'product'}${suffix}`
}

export async function resolveUniqueProductSlug(
  storeId: string,
  productName: string,
  options?: { excludeProductId?: string }
): Promise<string> {
  const baseSlug = slugifyProductName(productName)
  let candidate = baseSlug
  let counter = 2

  while (true) {
    const conditions = [
      eq(storeProducts.storeId, storeId),
      eq(storeProducts.slug, candidate),
    ]

    if (options?.excludeProductId) {
      conditions.push(ne(storeProducts.id, options.excludeProductId))
    }

    const existing = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(...conditions))
      .limit(1)

    if (!existing[0]) {
      return candidate
    }

    candidate = buildSlugWithSuffix(baseSlug, counter)
    counter += 1
  }
}

function buildSkuCandidate(): string {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  return `PRD-${token}`
}

export async function resolveUniqueProductSku(
  storeId: string,
  options?: { excludeProductId?: string }
): Promise<string> {
  while (true) {
    const candidate = buildSkuCandidate()

    const conditions = [
      eq(storeProducts.storeId, storeId),
      eq(storeProducts.sku, candidate),
    ]

    if (options?.excludeProductId) {
      conditions.push(ne(storeProducts.id, options.excludeProductId))
    }

    const existing = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(...conditions))
      .limit(1)

    if (!existing[0]) {
      return candidate
    }
  }
}
