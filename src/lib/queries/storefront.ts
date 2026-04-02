/**
 * Storefront queries used directly in Server Components.
 * All queries rely on real database data only.
 */

import { db } from '@/db'
import {
  storeProducts,
  storeCategories,
  storeHeroSlides,
  storePages,
  storeReviews,
  stores,
  storeProductRelations,
} from '@/db/schema'
import { eq, and, desc, asc, ilike, count, ne, inArray, gte, lte, gt, sql } from 'drizzle-orm'
import { escapeLike } from '@/lib/utils'

// ============================================
// PRODUCTS
// ============================================

export async function getStorefrontProducts(
  storeId: string,
  options?: {
    categoryId?: string
    search?: string
    featured?: boolean
    page?: number
    limit?: number
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'name'
    // P4-D: Advanced Filters
    minPrice?: number
    maxPrice?: number
    rating?: number
    inStock?: boolean
    onSale?: boolean
  }
) {
  const {
    categoryId,
    search,
    featured,
    page = 1,
    limit = 20,
    sort = 'newest',
    minPrice,
    maxPrice,
    rating,
    inStock,
    onSale,
  } = options ?? {}

  const conditions = [
    eq(storeProducts.storeId, storeId),
    eq(storeProducts.isActive, true),
  ]

  if (categoryId) conditions.push(eq(storeProducts.categoryId, categoryId))
  if (search) conditions.push(ilike(storeProducts.name, `%${escapeLike(search)}%`))
  if (featured) conditions.push(eq(storeProducts.isFeatured, true))

  // P4-D: Advanced Filters
  if (minPrice !== undefined && minPrice >= 0) {
    conditions.push(gte(storeProducts.price, String(minPrice)))
  }
  if (maxPrice !== undefined && maxPrice > 0) {
    conditions.push(lte(storeProducts.price, String(maxPrice)))
  }
  if (inStock) {
    conditions.push(gt(storeProducts.stock, 0))
  }
  if (onSale) {
    conditions.push(
      sql`${storeProducts.compareAtPrice} IS NOT NULL AND ${storeProducts.compareAtPrice}::numeric > ${storeProducts.price}::numeric`
    )
  }

  const orderBy =
    sort === 'price-asc' ? asc(storeProducts.price) :
    sort === 'price-desc' ? desc(storeProducts.price) :
    sort === 'name' ? asc(storeProducts.name) :
    desc(storeProducts.createdAt)

  const offset = (page - 1) * limit

  const totalResult = await db
    .select({ count: count() })
    .from(storeProducts)
    .where(and(...conditions))

  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  // P4-D: Rating post-filter
  let filteredProducts = products

  if (rating && rating >= 1 && rating <= 5) {
    const productIds = products.map(p => p.id)
    if (productIds.length > 0) {
      const ratingsResult = await db
        .select({
          productId: storeReviews.productId,
          avgRating: sql<number>`avg(${storeReviews.rating})`.as('avg_rating'),
        })
        .from(storeReviews)
        .where(
          and(
            eq(storeReviews.storeId, storeId),
            eq(storeReviews.isApproved, true),
            inArray(storeReviews.productId, productIds),
          )
        )
        .groupBy(storeReviews.productId)

      const ratingsMap = new Map(ratingsResult.map(r => [r.productId, Number(r.avgRating)]))

      filteredProducts = products.filter(p => {
        const avgRating = ratingsMap.get(p.id)
        return avgRating !== undefined && avgRating >= rating
      })
    } else {
      filteredProducts = []
    }
  }

  return {
    products: filteredProducts,
    total: rating ? filteredProducts.length : (totalResult[0]?.count ?? 0),
    page,
    totalPages: rating
      ? Math.ceil(filteredProducts.length / limit)
      : Math.ceil((totalResult[0]?.count ?? 0) / limit),
  }
}

export async function getStorefrontProduct(storeId: string, slug: string) {
  const result = await db
    .select()
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.slug, slug),
        eq(storeProducts.isActive, true),
      )
    )
    .limit(1)

  return result[0] ?? null
}

export async function getStorefrontProductById(storeId: string, productId: string) {
  const result = await db
    .select()
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.id, productId),
        eq(storeProducts.isActive, true),
      )
    )
    .limit(1)

  return result[0] ?? null
}

// ============================================
// CATEGORIES
// ============================================

export async function getStorefrontCategories(storeId: string) {
  return db
    .select({
      id: storeCategories.id,
      name: storeCategories.name,
      slug: storeCategories.slug,
      description: storeCategories.description,
      imageUrl: storeCategories.imageUrl,
      parentId: storeCategories.parentId,
      sortOrder: storeCategories.sortOrder,
    })
    .from(storeCategories)
    .where(and(eq(storeCategories.storeId, storeId), eq(storeCategories.isActive, true)))
    .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name))
}

export async function getStorefrontCategory(storeId: string, slug: string) {
  const result = await db
    .select()
    .from(storeCategories)
    .where(
      and(
        eq(storeCategories.storeId, storeId),
        eq(storeCategories.slug, slug),
        eq(storeCategories.isActive, true),
      )
    )
    .limit(1)

  return result[0] ?? null
}

export async function getStorefrontCategoryById(storeId: string, categoryId: string) {
  const result = await db
    .select()
    .from(storeCategories)
    .where(
      and(
        eq(storeCategories.storeId, storeId),
        eq(storeCategories.id, categoryId),
        eq(storeCategories.isActive, true),
      )
    )
    .limit(1)

  return result[0] ?? null
}

export async function resolveStorefrontCategory(
  storeId: string,
  lookup: { categoryId?: string | null; slug?: string | null }
) {
  if (lookup.categoryId) {
    const byId = await getStorefrontCategoryById(storeId, lookup.categoryId)
    if (byId) return byId
  }

  if (lookup.slug) {
    return getStorefrontCategory(storeId, lookup.slug)
  }

  return null
}

// ============================================
// HERO SLIDES
// ============================================

export async function getStorefrontHeroSlides(storeId: string) {
  return db
    .select()
    .from(storeHeroSlides)
    .where(and(eq(storeHeroSlides.storeId, storeId), eq(storeHeroSlides.isActive, true)))
    .orderBy(asc(storeHeroSlides.sortOrder))
}

// ============================================
// PAGES
// ============================================

export async function getStorefrontPage(storeId: string, slug: string) {
  const result = await db
    .select()
    .from(storePages)
    .where(
      and(
        eq(storePages.storeId, storeId),
        eq(storePages.slug, slug),
        eq(storePages.isPublished, true),
      )
    )
    .limit(1)

  return result[0] ?? null
}

export async function getStorefrontPublishedPages(storeId: string) {
  return db
    .select({
      id: storePages.id,
      title: storePages.title,
      slug: storePages.slug,
      pageType: storePages.pageType,
    })
    .from(storePages)
    .where(
      and(
        eq(storePages.storeId, storeId),
        eq(storePages.isPublished, true),
      )
    )
    .orderBy(asc(storePages.createdAt))
}

// ============================================
// REVIEWS
// ============================================

export async function getProductReviews(
  storeId: string,
  productId: string,
  limit = 10
) {
  return db
    .select()
    .from(storeReviews)
    .where(
      and(
        eq(storeReviews.storeId, storeId),
        eq(storeReviews.productId, productId),
        eq(storeReviews.isApproved, true),
      )
    )
    .orderBy(desc(storeReviews.createdAt))
    .limit(limit)
}

// ============================================
// FULL STORE DATA (for layout)
// ============================================

export async function getStorefrontData(storeId: string) {
  const store = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1)

  if (!store[0]) return null

  // defense-in-depth: لو المتجر مش مدفوع، ما نرجعش بيانات
  if (!store[0].isPaid) return null

  const [categories, heroSlides, pages] = await Promise.all([
    getStorefrontCategories(storeId),
    getStorefrontHeroSlides(storeId),
    getStorefrontPublishedPages(storeId),
  ])

  return {
    store: store[0],
    categories,
    heroSlides,
    pages,
  }
}

// ============================================
// CONVENIENCE QUERY LAYER — طبقة الاستعلامات المُبسَّطة
// تُستخدم مباشرة في صفحات storefront
// ============================================

/** جلب سلايدات البطل (Hero) للمتجر */
export async function getHeroSlides(storeId: string) {
  return getStorefrontHeroSlides(storeId)
}

/** جلب تصنيفات المتجر مع إمكانية تحديد العدد */
export async function getStoreCategories(
  storeId: string,
  options?: { limit?: number }
) {
  const query = db
    .select({
      id: storeCategories.id,
      name: storeCategories.name,
      slug: storeCategories.slug,
      description: storeCategories.description,
      imageUrl: storeCategories.imageUrl,
      parentId: storeCategories.parentId,
      sortOrder: storeCategories.sortOrder,
    })
    .from(storeCategories)
    .where(
      and(
        eq(storeCategories.storeId, storeId),
        eq(storeCategories.isActive, true),
      )
    )
    .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.name))

  if (options?.limit) {
    return query.limit(options.limit)
  }
  return query
}

/** جلب المنتجات المميزة */
export async function getFeaturedProducts(
  storeId: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 8

  return db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.isActive, true),
        eq(storeProducts.isFeatured, true),
      )
    )
    .orderBy(asc(storeProducts.sortOrder), desc(storeProducts.createdAt))
    .limit(limit)
}

/** جلب أحدث المنتجات */
export async function getLatestProducts(
  storeId: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 8

  return db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.isActive, true),
      )
    )
    .orderBy(desc(storeProducts.createdAt))
    .limit(limit)
}

/** جلب منتج واحد بالـ slug */
export async function getProductBySlug(storeId: string, slug: string) {
  return getStorefrontProduct(storeId, slug)
}

/** جلب منتج واحد بالـ id */
export async function getProductById(storeId: string, productId: string) {
  return getStorefrontProductById(storeId, productId)
}

/** جلب التصنيف مع منتجاته بالـ slug */
async function getCategoryProducts(storeId: string, categoryId: string, limit: number) {
  return db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.categoryId, categoryId),
        eq(storeProducts.isActive, true),
      )
    )
    .orderBy(asc(storeProducts.sortOrder), desc(storeProducts.createdAt))
    .limit(limit)
}

export async function getCategoryWithProducts(
  storeId: string,
  lookup: { categoryId?: string | null; slug?: string | null },
  options?: { limit?: number }
) {
  const category = await resolveStorefrontCategory(storeId, lookup)
  if (!category) return null

  const limit = options?.limit ?? 20
  const products = await getCategoryProducts(storeId, category.id, limit)

  return { category, products }
}

export async function getCategoryWithProductsBySlug(
  storeId: string,
  slug: string,
  options?: { limit?: number }
) {
  return getCategoryWithProducts(storeId, { slug }, options)
}

/** جلب منتجات مشابهة (نفس التصنيف مع استثناء المنتج الحالي) */
export async function getRelatedProducts(
  storeId: string,
  categoryId: string,
  excludeProductId: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 4

  return db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.categoryId, categoryId),
        eq(storeProducts.isActive, true),
        ne(storeProducts.id, excludeProductId),
      )
    )
    .orderBy(desc(storeProducts.createdAt))
    .limit(limit)
}

/** جلب منتجات Cross-sell المرتبطة بمنتج معين */
export async function getCrossSellProducts(
  storeId: string,
  productId: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 4

  const relations = await db
    .select({
      relatedProductId: storeProductRelations.relatedProductId,
    })
    .from(storeProductRelations)
    .where(
      and(
        eq(storeProductRelations.storeId, storeId),
        eq(storeProductRelations.productId, productId),
        eq(storeProductRelations.relationType, 'cross_sell'),
      )
    )
    .orderBy(asc(storeProductRelations.sortOrder))
    .limit(limit)

  if (relations.length === 0) return []

  const relatedIds = relations.map((r) => r.relatedProductId)

  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.isActive, true),
        inArray(storeProducts.id, relatedIds),
      )
    )

  // Filter to only related IDs and preserve sort order
  return relatedIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as typeof products
}

/** بحث في منتجات المتجر — يُستخدم في Live Search */
export async function searchStoreProducts(
  storeId: string,
  query: string,
  options?: { limit?: number }
) {
  const limit = options?.limit ?? 6

  return db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
    })
    .from(storeProducts)
    .where(
      and(
        eq(storeProducts.storeId, storeId),
        eq(storeProducts.isActive, true),
        ilike(storeProducts.name, `%${escapeLike(query)}%`),
      )
    )
    .orderBy(asc(storeProducts.sortOrder), desc(storeProducts.createdAt))
    .limit(limit)
}

/** جلب صفحة مخصصة بالـ slug */
export async function getPageBySlug(storeId: string, slug: string) {
  return getStorefrontPage(storeId, slug)
}

/** جلب منتجات لعرضها في block "products" داخل الصفحات المخصصة */
export async function getProductsForBlock(
  storeId: string,
  options?: { limit?: number; categoryId?: string | null; featured?: boolean }
) {
  const limit = options?.limit ?? 8

  const conditions = [
    eq(storeProducts.storeId, storeId),
    eq(storeProducts.isActive, true),
  ]

  if (options?.categoryId) {
    conditions.push(eq(storeProducts.categoryId, options.categoryId))
  }
  if (options?.featured) {
    conditions.push(eq(storeProducts.isFeatured, true))
  }

  return db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      slug: storeProducts.slug,
      price: storeProducts.price,
      compareAtPrice: storeProducts.compareAtPrice,
      images: storeProducts.images,
      shortDescription: storeProducts.shortDescription,
      stock: storeProducts.stock,
      isFeatured: storeProducts.isFeatured,
      variants: storeProducts.variants,
      translations: storeProducts.translations,
    })
    .from(storeProducts)
    .where(and(...conditions))
    .orderBy(asc(storeProducts.sortOrder), desc(storeProducts.createdAt))
    .limit(limit)
}





