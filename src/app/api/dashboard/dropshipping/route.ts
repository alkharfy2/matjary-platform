export const maxDuration = 30
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { storeSupplierProducts, storeProducts } from '@/db/schema'
import { apiSuccess, handleApiError, ApiErrors } from '@/lib/api/response'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const supplierProductSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  supplierName: z.string().min(1, { error: 'اسم المورد مطلوب' }).max(200),
  supplierProductUrl: z.string().url({ error: 'رابط غير صالح' }).optional().nullable(),
  supplierPrice: z.coerce.number().min(0, { error: 'السعر لا يقل عن 0' }),
  retailPrice: z.coerce.number().min(0, { error: 'السعر لا يقل عن 0' }),
  autoOrder: z.boolean().default(false),
  leadTimeDays: z.coerce.number().int().min(1).max(365).default(7),
  notes: z.string().max(500).optional().nullable(),
})

/**
 * GET /api/dashboard/dropshipping — كل الروابط
 */
export async function GET() {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const links = await db
      .select({
        supplierProduct: storeSupplierProducts,
        productName: storeProducts.name,
        productImage: storeProducts.images,
      })
      .from(storeSupplierProducts)
      .leftJoin(storeProducts, eq(storeSupplierProducts.productId, storeProducts.id))
      .where(eq(storeSupplierProducts.storeId, store.id))
      .orderBy(desc(storeSupplierProducts.createdAt))

    return apiSuccess(links)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/dashboard/dropshipping — ربط منتج بمورد
 */
export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const body = await request.json()
    const data = supplierProductSchema.parse(body)

    if (data.retailPrice <= data.supplierPrice) {
      return ApiErrors.validation('سعر البيع لازم يكون أكبر من سعر المورد')
    }

    const [link] = await db
      .insert(storeSupplierProducts)
      .values({
        storeId: store.id,
        ...data,
        supplierPrice: String(data.supplierPrice),
        retailPrice: String(data.retailPrice),
      })
      .returning()

    return apiSuccess(link, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
