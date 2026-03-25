import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import { verifyStoreOwnership } from '@/lib/api/auth'
import {
  categoryBelongsToStore,
  resolveUniqueProductSlug,
  resolveUniqueProductSku,
} from '@/lib/api/dashboard/products'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import {
  getDashboardProducts,
  normalizeDashboardProductsFilters,
} from '@/lib/queries/dashboard-products'
import { slugifyProductName } from '@/lib/products/product-slug'
import { createProductSchema } from '@/lib/validations/product'

/**
 * GET /api/dashboard/products Ã¯Â¿Â½ ????? ?????? ??????
 * Query: ?search=&category=&status=active|draft&page=1&limit=20&sort=newest|oldest|price-asc|price-desc
 */
export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { searchParams } = request.nextUrl
    const filters = normalizeDashboardProductsFilters({
      search: searchParams.get('search') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
    })

    const result = await getDashboardProducts(store.id, filters)
    return apiSuccess(result)
  } catch (error) {
    console.error('GET /api/dashboard/products error:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/products Ã¯Â¿Â½ ????? ???? ????
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const generatedSlugInput =
      typeof body?.name === 'string' ? slugifyProductName(body.name) : ''
    const parsed = createProductSchema.safeParse({
      ...body,
      slug: generatedSlugInput,
    })

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? '?????? ??? ?????')
    }

    const data = parsed.data

    if (data.categoryId) {
      const validCategory = await categoryBelongsToStore(store.id, data.categoryId)
      if (!validCategory) {
        return ApiErrors.validation('??????? ?????? ??? ????? ?? ?????')
      }
    }

    const generatedSlug = await resolveUniqueProductSlug(store.id, data.name)
    const normalizedSku = data.sku?.trim() ?? ''
    const generatedSku = normalizedSku || await resolveUniqueProductSku(store.id)

    const newProduct = await db
      .insert(storeProducts)
      .values({
        storeId: store.id,
        name: data.name,
        slug: generatedSlug,
        description: data.description,
        shortDescription: data.shortDescription,
        price: String(data.price),
        compareAtPrice:
          data.compareAtPrice !== null && data.compareAtPrice !== undefined
            ? String(data.compareAtPrice)
            : null,
        costPrice:
          data.costPrice !== null && data.costPrice !== undefined
            ? String(data.costPrice)
            : null,
        sku: generatedSku,
        barcode: data.barcode,
        stock: data.stock,
        trackInventory: data.trackInventory,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isDigital: data.isDigital,
        sortOrder: data.sortOrder,
        weight:
          data.weight !== null && data.weight !== undefined
            ? String(data.weight)
            : null,
        categoryId: data.categoryId,
        tags: data.tags ?? [],
        variants: data.variants,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        images: data.images,
      })
      .returning()

    return apiSuccess(newProduct[0], 201)
  } catch (error) {
    console.error('POST /api/dashboard/products error:', error)
    return handleApiError(error)
  }
}

