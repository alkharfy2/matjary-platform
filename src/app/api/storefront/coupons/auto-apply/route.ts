export const maxDuration = 30
import { NextRequest } from 'next/server'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { apiSuccess, ApiErrors, handleApiError } from '@/lib/api/response'
import { findAutoApplyCoupons, selectBestAutoApplyCoupon } from '@/lib/coupons/auto-apply'

/**
 * POST /api/storefront/coupons/auto-apply
 * يبحث عن أفضل كوبون تلقائي للسلة
 */
export async function POST(request: NextRequest) {
  try {
    const store = await getCurrentStore()
    if (!store) return ApiErrors.storeNotFound()

    const body = await request.json()
    const { subtotal, customerPhone } = body as { subtotal: number; customerPhone?: string }

    if (!subtotal || subtotal <= 0) {
      return apiSuccess({ coupon: null })
    }

    const coupons = await findAutoApplyCoupons(store.id, subtotal, customerPhone)
    const best = selectBestAutoApplyCoupon(coupons, subtotal)

    if (!best) {
      return apiSuccess({ coupon: null })
    }

    // Calculate discount
    let discountAmount = 0
    if (best.isFreeShipping) {
      return apiSuccess({
        coupon: {
          code: best.code,
          type: 'free_shipping',
          discountAmount: 0,
          isFreeShipping: true,
        },
      })
    }

    if (best.type === 'percentage') {
      discountAmount = subtotal * (parseFloat(best.value) / 100)
      if (best.maxDiscount) {
        discountAmount = Math.min(discountAmount, parseFloat(best.maxDiscount))
      }
    } else {
      discountAmount = parseFloat(best.value)
    }
    discountAmount = Math.min(discountAmount, subtotal)
    discountAmount = Math.round(discountAmount * 100) / 100

    return apiSuccess({
      coupon: {
        code: best.code,
        type: best.type,
        discountAmount,
        isFreeShipping: false,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
