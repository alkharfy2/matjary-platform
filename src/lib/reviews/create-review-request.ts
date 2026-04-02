import 'server-only'
import { db } from '@/db'
import { storeReviewRequests } from '@/db/schema'
import { nanoid } from 'nanoid'
import { sendEmail } from '@/lib/email/resend'

type CreateReviewRequestInput = {
  storeId: string
  orderId: string
  customerEmail: string | null
  customerPhone: string
  customerName: string
  delayHours: number
  storeName: string
  storeSlug: string
}

/**
 * ينشئ طلب تقييم ويرسل الإيميل فوراً.
 *
 * بما إن مفيش Cron jobs في المشروع (Vercel Hobby):
 * - ننشئ الطلب فوراً في DB بـ `status: 'sent'`
 * - نرسل الإيميل فوراً (fire-and-forget)
 */
export async function createReviewRequest(input: CreateReviewRequestInput): Promise<void> {
  const reviewToken = nanoid(32)
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 يوم

  await db.insert(storeReviewRequests).values({
    storeId: input.storeId,
    orderId: input.orderId,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerName: input.customerName,
    reviewToken,
    expiresAt,
    status: 'sent',
    sentAt: new Date(),
  }).onConflictDoNothing()

  if (input.customerEmail) {
    const reviewUrl = `https://${input.storeSlug}.matjary.com/review/${reviewToken}`

    import('@/lib/email/templates/review-request').then(({ ReviewRequestEmail }) =>
      sendEmail({
        to: input.customerEmail!,
        subject: `⭐ قيّم تجربتك مع ${input.storeName}`,
        react: ReviewRequestEmail({
          storeName: input.storeName,
          customerName: input.customerName,
          reviewUrl,
        }),
      }).catch((err) => console.error('[ReviewRequest Email] Error:', err))
    ).catch(() => {})
  }
}
