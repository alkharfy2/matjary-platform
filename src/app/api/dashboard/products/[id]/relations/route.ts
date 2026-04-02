export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeProductRelations as productRelationsTable, storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { z } from 'zod'

type RouteCtx = { params: Promise<{ id: string }> }

const addRelationSchema = z.object({
  relatedProductId: z.string().uuid({ error: 'معرف المنتج المرتبط مطلوب' }),
  relationType: z.enum(['cross_sell', 'upsell', 'related']).optional(),
  sortOrder: z.number().int().optional(),
})

/**
 * GET /api/dashboard/products/[id]/relations — قائمة العلاقات
 */
export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id: productId } = await ctx.params

    const relations = await db
      .select({
        relation: productRelationsTable,
        relatedProduct: {
          id: storeProducts.id,
          name: storeProducts.name,
          price: storeProducts.price,
          images: storeProducts.images,
        },
      })
      .from(productRelationsTable)
      .innerJoin(storeProducts, eq(productRelationsTable.relatedProductId, storeProducts.id))
      .where(and(
        eq(productRelationsTable.storeId, store.id),
        eq(productRelationsTable.productId, productId),
      ))
      .orderBy(productRelationsTable.sortOrder)

    return apiSuccess(relations)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/products/[id]/relations — إضافة علاقة
 */
export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id: productId } = await ctx.params
    const body = await request.json()
    const parsed = addRelationSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة')
    }

    const { relatedProductId, relationType, sortOrder } = parsed.data

    if (relatedProductId === productId) {
      return ApiErrors.validation('لا يمكن ربط منتج بنفسه')
    }

    // Verify related product belongs to store
    const [relatedProduct] = await db
      .select({ id: storeProducts.id })
      .from(storeProducts)
      .where(and(eq(storeProducts.id, relatedProductId), eq(storeProducts.storeId, store.id)))
      .limit(1)

    if (!relatedProduct) return ApiErrors.validation('المنتج المرتبط غير موجود في متجرك')

    const relation = await db
      .insert(productRelationsTable)
      .values({
        storeId: store.id,
        productId,
        relatedProductId,
        relationType: relationType ?? 'cross_sell',
        sortOrder: sortOrder ?? 0,
      })
      .onConflictDoNothing()
      .returning()

    if (relation.length === 0) {
      return ApiErrors.validation('هذه العلاقة موجودة بالفعل')
    }

    return apiSuccess(relation[0], 201)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/dashboard/products/[id]/relations — حذف علاقة
 */
export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const { id: productId } = await ctx.params
    const { searchParams } = request.nextUrl
    const relationId = searchParams.get('relationId')

    if (!relationId) return ApiErrors.validation('relationId مطلوب')

    await db
      .delete(productRelationsTable)
      .where(and(
        eq(productRelationsTable.id, relationId),
        eq(productRelationsTable.storeId, store.id),
        eq(productRelationsTable.productId, productId),
      ))

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
