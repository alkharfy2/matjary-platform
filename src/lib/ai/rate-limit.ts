import { db } from '@/db'
import { storeAiUsage } from '@/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import { AI_DAILY_LIMITS } from './openai-client'

type AiFeature = 'store_builder' | 'product_description' | 'ad_copy' | 'insights'

export async function checkAiRateLimit(
  storeId: string,
  feature: AiFeature,
  isPaidPlan: boolean,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storeAiUsage)
    .where(and(
      eq(storeAiUsage.storeId, storeId),
      gte(storeAiUsage.createdAt, today),
    ))

  const used = result?.count ?? 0
  const limit = isPaidPlan ? AI_DAILY_LIMITS.paid : AI_DAILY_LIMITS.free

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  }
}

export async function recordAiUsage(
  storeId: string,
  feature: AiFeature,
  tokensUsed: number,
) {
  await db.insert(storeAiUsage).values({
    storeId,
    feature,
    tokensUsed,
  })
}
