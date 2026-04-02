export const maxDuration = 30
import { NextRequest } from 'next/server'
import { and, eq } from 'drizzle-orm'
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
  deleteImagesBestEffort,
  extractStoragePathFromUrl,
} from '@/lib/supabase/storage'
import { updateProductSchema } from '@/lib/validations/product'

type Params = { params: Promise<{ id: string }> }

function extractOwnedImagePaths(storeId: string, urls: string[]): string[] {
  return urls
    .map((url) => extractStoragePathFromUrl(url))
    .filter((path): path is string => Boolean(path))
    .filter((path) => path.startsWith(`${storeId}/`))
}

/**
 * GET /api/dashboard/products/[id] Ã¯Â¿Â½ ?????? ????
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params
    const product = await db
      .select()
      .from(storeProducts)
      .where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
      .limit(1)

    if (!product[0]) return ApiErrors.notFound('??????')

    return apiSuccess(product[0])
  } catch (error) {
    console.error('GET /api/dashboard/products/[id] error:', error)
    return handleApiError(error)
  }
}

/**
 * PUT /api/dashboard/products/[id] Ã¯Â¿Â½ ????? ????
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existingProduct = await db
      .select({
        id: storeProducts.id,
        images: storeProducts.images,
        sku: storeProducts.sku,
      })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
      .limit(1)

    const existing = existingProduct[0]
    if (!existing) return ApiErrors.notFound('??????')

    const body = await request.json()
    const parsed = updateProductSchema.safeParse(body)

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


    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.name !== undefined) {
      updateData.name = data.name
      updateData.slug = await resolveUniqueProductSlug(store.id, data.name, {
        excludeProductId: id,
      })
    }
    if (data.description !== undefined) updateData.description = data.description
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription
    if (data.price !== undefined) updateData.price = String(data.price)

    if (data.compareAtPrice !== undefined) {
      updateData.compareAtPrice =
        data.compareAtPrice === null ? null : String(data.compareAtPrice)
    }

    if (data.costPrice !== undefined) {
      updateData.costPrice = data.costPrice === null ? null : String(data.costPrice)
    }

    if (data.sku !== undefined) {
      const normalizedSku = data.sku?.trim() ?? ''
      updateData.sku = normalizedSku || await resolveUniqueProductSku(store.id, {
        excludeProductId: id,
      })
    }
    if (data.barcode !== undefined) updateData.barcode = data.barcode
    if (data.stock !== undefined) updateData.stock = data.stock
    if (data.trackInventory !== undefined) updateData.trackInventory = data.trackInventory
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
    if (data.isDigital !== undefined) updateData.isDigital = data.isDigital
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    if (data.weight !== undefined) {
      updateData.weight = data.weight === null ? null : String(data.weight)
    }

    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.seoTitle !== undefined) updateData.seoTitle = data.seoTitle
    if (data.seoDescription !== undefined) updateData.seoDescription = data.seoDescription
    if (data.variants !== undefined) updateData.variants = data.variants
    if (data.images !== undefined) updateData.images = data.images
    if (data.translations !== undefined) updateData.translations = data.translations ?? {}

    const updated = await db
      .update(storeProducts)
      .set(updateData)
      .where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
      .returning()

    if (data.images) {
      const nextImages = data.images
      const removedImageUrls = existing.images.filter(
        (url) => !nextImages.includes(url)
      )
      const removedPaths = extractOwnedImagePaths(store.id, removedImageUrls)
      const result = await deleteImagesBestEffort(removedPaths)

      if (result.failed > 0) {
        console.error(
          `PUT /api/dashboard/products/${id}: failed to delete ${result.failed} image(s) from storage`
        )
      }
    }

    return apiSuccess(updated[0])
  } catch (error) {
    console.error('PUT /api/dashboard/products/[id] error:', error)
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/products/[id] Ã¯Â¿Â½ ??? ????
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id } = await params

    const existingProduct = await db
      .select({
        id: storeProducts.id,
        images: storeProducts.images,
        sku: storeProducts.sku,
      })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))
      .limit(1)

    const existing = existingProduct[0]
    if (!existing) return ApiErrors.notFound('??????')

    await db
      .delete(storeProducts)
      .where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))

    const imagePaths = extractOwnedImagePaths(store.id, existing.images)
    await deleteImagesBestEffort(imagePaths)

    await db.delete(storeProducts).where(and(eq(storeProducts.id, id), eq(storeProducts.storeId, store.id)))

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('DELETE /api/dashboard/products/[id] error:', error)
    return handleApiError(error)
  }
}

