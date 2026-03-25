import { and, asc, count, desc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db'
import { storeCategories, storeProducts } from '@/db/schema'
import { escapeLike } from '@/lib/utils'

export type DashboardProductsSort =
  | 'newest'
  | 'oldest'
  | 'price-asc'
  | 'price-desc'

export type DashboardProductsStatus = 'all' | 'active' | 'draft'

export type DashboardProductsFilters = {
  search: string
  category: string
  status: DashboardProductsStatus
  page: number
  limit: number
  sort: DashboardProductsSort
}

type RawDashboardProductsFilters = {
  search?: string
  category?: string
  status?: string
  page?: string
  limit?: string
  sort?: string
}

function parseNumberParam(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(value ?? '', 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function normalizeDashboardProductsFilters(
  input: RawDashboardProductsFilters
): DashboardProductsFilters {
  const status =
    input.status === 'active' || input.status === 'draft'
      ? input.status
      : 'all'

  const sort: DashboardProductsSort =
    input.sort === 'oldest' ||
    input.sort === 'price-asc' ||
    input.sort === 'price-desc'
      ? input.sort
      : 'newest'

  return {
    search: input.search?.trim() ?? '',
    category: input.category?.trim() ?? '',
    status,
    page: parseNumberParam(input.page, 1, 1, 9999),
    limit: parseNumberParam(input.limit, 20, 1, 50),
    sort,
  }
}

export async function getDashboardProductCategories(storeId: string) {
  return db
    .select({
      id: storeCategories.id,
      name: storeCategories.name,
    })
    .from(storeCategories)
    .where(eq(storeCategories.storeId, storeId))
    .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name))
}

export async function getDashboardProducts(
  storeId: string,
  filters: DashboardProductsFilters
) {
  const conditions = [eq(storeProducts.storeId, storeId)]

  if (filters.search) {
    conditions.push(ilike(storeProducts.name, `%${escapeLike(filters.search)}%`))
  }

  if (filters.category) {
    conditions.push(eq(storeProducts.categoryId, filters.category))
  }

  if (filters.status === 'active') {
    conditions.push(eq(storeProducts.isActive, true))
  } else if (filters.status === 'draft') {
    conditions.push(eq(storeProducts.isActive, false))
  }

  const orderBy =
    filters.sort === 'oldest'
      ? asc(storeProducts.createdAt)
      : filters.sort === 'price-asc'
        ? asc(storeProducts.price)
        : filters.sort === 'price-desc'
          ? desc(storeProducts.price)
          : desc(storeProducts.createdAt)

  const totalResult = await db
    .select({ count: count() })
    .from(storeProducts)
    .where(and(...conditions))

  const total = totalResult[0]?.count ?? 0
  const offset = (filters.page - 1) * filters.limit

  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      stock: storeProducts.stock,
      images: storeProducts.images,
      isActive: storeProducts.isActive,
      categoryId: storeProducts.categoryId,
      categoryName: storeCategories.name,
      createdAt: storeProducts.createdAt,
    })
    .from(storeProducts)
    .leftJoin(
      storeCategories,
      and(
        eq(storeProducts.categoryId, storeCategories.id),
        eq(storeCategories.storeId, storeId)
      )
    )
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(filters.limit)
    .offset(offset)

  return {
    products,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / filters.limit),
  }
}

