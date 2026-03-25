import { NextRequest } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/db'
import { stores, merchants, platformPlans } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { apiSuccess, apiError, ApiErrors, handleApiError } from '@/lib/api/response'
import { createStoreSchema } from '@/lib/validations/store'
import { rateLimit, getClientIp, RATE_LIMIT_STORE_CREATE } from '@/lib/api/rate-limit'

type MerchantRow = typeof merchants.$inferSelect

type ClerkUserLike = {
  primaryEmailAddressId?: string | null
  emailAddresses?: Array<{ id: string; emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  phoneNumbers?: Array<{ phoneNumber: string }>
  imageUrl?: string | null
}

type EnsureMerchantResult =
  | { merchant: MerchantRow; provisionedByFallback: boolean }
  | { merchant: null; missingEmail: true }

async function findMerchantByClerkUserId(userId: string): Promise<MerchantRow | null> {
  const rows = await db
    .select()
    .from(merchants)
    .where(eq(merchants.clerkUserId, userId))
    .limit(1)

  return rows[0] ?? null
}

function getPrimaryEmailFromClerkUser(user: ClerkUserLike): string | null {
  const primaryEmail =
    (user.primaryEmailAddressId
      ? user.emailAddresses?.find((email) => email.id === user.primaryEmailAddressId)
          ?.emailAddress
      : undefined) ?? user.emailAddresses?.[0]?.emailAddress

  return primaryEmail?.trim() || null
}

async function ensureMerchantForClerkUser(userId: string): Promise<EnsureMerchantResult> {
  const existingMerchant = await findMerchantByClerkUserId(userId)
  if (existingMerchant) {
    return { merchant: existingMerchant, provisionedByFallback: false }
  }

  const client = await clerkClient()
  const clerkUser = (await client.users.getUser(userId)) as ClerkUserLike
  const email = getPrimaryEmailFromClerkUser(clerkUser)

  if (!email) {
    console.warn('Store merchant fallback failed - missing email', {
      clerkUserId: userId,
    })
    return { merchant: null, missingEmail: true }
  }

  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'تاجر جديد'

  await db
    .insert(merchants)
    .values({
      clerkUserId: userId,
      email,
      displayName,
      phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? null,
      avatarUrl: clerkUser.imageUrl ?? null,
    })
    .onConflictDoNothing({ target: merchants.clerkUserId })

  const ensuredMerchant = await findMerchantByClerkUserId(userId)
  if (!ensuredMerchant) {
    throw new Error(`Merchant fallback insert completed but row not found for Clerk user ${userId}`)
  }

  console.info('Merchant auto-provisioned via fallback', {
    clerkUserId: userId,
    merchantId: ensuredMerchant.id,
  })

  return { merchant: ensuredMerchant, provisionedByFallback: true }
}

/**
 * POST /api/stores — إنشاء متجر جديد (Onboarding)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — 5 طلبات / ساعة لكل IP
    const ip = getClientIp(request)
    const rl = rateLimit(`stores:create:${ip}`, RATE_LIMIT_STORE_CREATE)
    if (!rl.allowed) {
      return apiError('تم تجاوز الحد الأقصى للطلبات. حاول لاحقاً.', 429, 'RATE_LIMITED')
    }

    const { userId } = await auth()
    if (!userId) return ApiErrors.unauthorized()

    // Find the merchant
    const merchant = await db
      .select()
      .from(merchants)
      .where(eq(merchants.clerkUserId, userId))
      .limit(1)

    let merchantRow: MerchantRow | null = merchant[0] ?? null
    if (!merchantRow) {
      try {
        const ensuredMerchant = await ensureMerchantForClerkUser(userId)
        if (!ensuredMerchant.merchant) {
          return apiError(
            'لا يمكن إنشاء حساب التاجر بدون بريد إلكتروني أساسي في Clerk.',
            422,
            'MERCHANT_PROFILE_INCOMPLETE',
          )
        }
        merchantRow = ensuredMerchant.merchant
      } catch (error) {
        console.error('Store merchant fallback failed - clerk/db error:', error)
        return handleApiError(error)
      }
    }

    if (!merchantRow) {
      return apiError('يجب إنشاء حساب أولاً', 404, 'MERCHANT_NOT_FOUND')
    }

    // Check if merchant already has a store
    const existingStore = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.merchantId, merchantRow.id))
      .limit(1)

    if (existingStore[0]) {
      return apiError('لديك متجر بالفعل. كل تاجر يمكنه إنشاء متجر واحد فقط.', 422, 'STORE_EXISTS')
    }

    // Validate body
    const body = await request.json()
    const parsed = createStoreSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? 'بيانات غير صالحة'
      return ApiErrors.validation(firstError)
    }

    const { name, slug, planId } = parsed.data

    // Validate planId if provided
    let resolvedPlan = 'free'
    if (planId) {
      const planRow = await db
        .select({ id: platformPlans.id, priceMonthly: platformPlans.priceMonthly })
        .from(platformPlans)
        .where(eq(platformPlans.id, planId))
        .limit(1)
      if (planRow[0]) {
        resolvedPlan = planRow[0].id
      }

      // تحديد isPaid: المجانية = true، المدفوعة = false
      const isFree = !planRow[0] || parseFloat(planRow[0].priceMonthly) === 0

      // Create the store with conflict handling for slug race condition
      const newStore = await db
        .insert(stores)
        .values({
          merchantId: merchantRow.id,
          name,
          slug,
          contactEmail: merchantRow.email,
          plan: resolvedPlan,
          isPaid: isFree,
        })
        .onConflictDoNothing({ target: stores.slug })
        .returning({
          id: stores.id,
          name: stores.name,
          slug: stores.slug,
          plan: stores.plan,
          isPaid: stores.isPaid,
        })

      if (!newStore[0]) {
        return ApiErrors.validation('هذا الرابط مستخدم بالفعل. اختر رابطاً آخر.')
      }

      return apiSuccess(newStore[0], 201)
    }

    // No planId — default free plan (isPaid = true)
    const newStore = await db
      .insert(stores)
      .values({
        merchantId: merchantRow.id,
        name,
        slug,
        contactEmail: merchantRow.email,
        plan: resolvedPlan,
        isPaid: true,
      })
      .onConflictDoNothing({ target: stores.slug })
      .returning({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        plan: stores.plan,
        isPaid: stores.isPaid,
      })

    if (!newStore[0]) {
      return ApiErrors.validation('هذا الرابط مستخدم بالفعل. اختر رابطاً آخر.')
    }

    return apiSuccess(newStore[0], 201)
  } catch (error) {
    console.error('Error creating store:', error)
    return handleApiError(error)
  }
}