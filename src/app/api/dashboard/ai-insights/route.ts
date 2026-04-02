import { NextRequest } from 'next/server'
import { openai, AI_MODEL } from '@/lib/ai/openai-client'

export const maxDuration = 30
import { INSIGHTS_SYSTEM_PROMPT, buildInsightsPrompt } from '@/lib/ai/prompts/insights'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { apiSuccess, ApiErrors } from '@/lib/api/response'
import { checkAiRateLimit, recordAiUsage } from '@/lib/ai/rate-limit'
import { getDashboardAnalyticsData } from '@/lib/queries/dashboard-analytics'
import { db } from '@/db'
import { stores, storeProducts, storeOrders, storeAbandonedCarts } from '@/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import type { AiInsightsResponse, AiInsight } from '@/lib/ai/types'

export async function GET(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    
    // Check cache
    const cachedInsights = store.settings?.aiInsightsCache
    const cachedDate = store.settings?.aiInsightsLastGenerated
    
    if (cachedInsights && cachedDate) {
      const lastGenerated = new Date(cachedDate)
      const now = new Date()
      const hoursSince = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60)
      
      if (hoursSince < 24) {
        try {
          const cached = JSON.parse(cachedInsights) as AiInsightsResponse
          return apiSuccess({ ...cached, fromCache: true })
        } catch {
          // cache corrupted — regenerate
        }
      }
    }
    
    // Rate limit
    const rateCheck = await checkAiRateLimit(store.id, 'insights', !store.isPaid)
    if (!rateCheck.allowed) {
      if (cachedInsights) {
        try {
          const cached = JSON.parse(cachedInsights) as AiInsightsResponse
          return apiSuccess({ ...cached, fromCache: true })
        } catch { /* ignore */ }
      }
      return ApiErrors.tooManyRequests('تم تجاوز الحد اليومي')
    }
    
    // Gather analytics data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const analyticsData = await getDashboardAnalyticsData(store.id, {
      from: sevenDaysAgo,
      to: new Date(),
    })
    
    // Abandoned carts count
    const [abandonedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeAbandonedCarts)
      .where(and(
        eq(storeAbandonedCarts.storeId, store.id),
        eq(storeAbandonedCarts.recoveryStatus, 'pending'),
      ))
    
    // Products count
    const [productsResult] = await db
      .select({ 
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where is_active = true)::int`,
      })
      .from(storeProducts)
      .where(eq(storeProducts.storeId, store.id))
    
    // Cancelled orders count
    const [cancelledResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(storeOrders)
      .where(and(
        eq(storeOrders.storeId, store.id),
        eq(storeOrders.orderStatus, 'cancelled'),
      ))
    
    // Streaming response to avoid Vercel Hobby 10s timeout
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => controller.enqueue(encoder.encode(' ')), 3000)
        try {
          const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: INSIGHTS_SYSTEM_PROMPT },
              { 
                role: 'user', 
                content: buildInsightsPrompt({
                  storeName: store.name,
                  totalOrders: analyticsData.summary.totalOrders ?? 0,
                  totalRevenue: analyticsData.summary.totalRevenue ?? 0,
                  ordersLast7Days: analyticsData.period.totalOrders ?? 0,
                  revenueLast7Days: analyticsData.period.totalRevenue ?? 0,
                  topProducts: (analyticsData.topProducts ?? []).slice(0, 5).map(p => ({
                    name: p.name,
                    sales: p.quantitySold,
                    revenue: p.revenue,
                  })),
                  abandonedCartsCount: abandonedResult?.count ?? 0,
                  averageOrderValue: analyticsData.period.averageOrderValue ?? 0,
                  cancelledOrdersCount: cancelledResult?.count ?? 0,
                  totalProducts: productsResult?.total ?? 0,
                  activeProducts: productsResult?.active ?? 0,
                  currency: store.settings?.currency ?? 'EGP',
                }),
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6,
            max_tokens: 1500,
          })
          clearInterval(heartbeat)

          const content = completion.choices[0]?.message?.content
          if (!content) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في توليد النصائح' })))
            controller.close()
            return
          }

          let result: { insights: AiInsight[] }
          try {
            result = JSON.parse(content) as { insights: AiInsight[] }
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في معالجة رد الذكاء الاصطناعي' })))
            controller.close()
            return
          }

          const insights: AiInsightsResponse = {
            insights: result.insights.map((insight, i) => ({
              ...insight,
              id: `insight-${i}-${Date.now()}`,
            })),
            generatedAt: new Date().toISOString(),
          }

          // Save to cache (fire-and-forget)
          db.update(stores).set({
            settings: {
              ...store.settings,
              aiInsightsCache: JSON.stringify(insights),
              aiInsightsLastGenerated: insights.generatedAt,
            },
          }).where(eq(stores.id, store.id)).catch(() => {})

          recordAiUsage(store.id, 'insights', completion.usage?.total_tokens ?? 0).catch(() => {})

          controller.enqueue(encoder.encode(JSON.stringify({
            success: true,
            data: { ...insights, fromCache: false },
          })))
          controller.close()
        } catch (err) {
          clearInterval(heartbeat)
          const msg = err instanceof Error && err.message.includes('rate_limit')
            ? 'خدمة الذكاء الاصطناعي مشغولة'
            : 'حدث خطأ غير متوقع'
          controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: msg })))
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('rate_limit')) {
      return ApiErrors.tooManyRequests('خدمة الذكاء الاصطناعي مشغولة')
    }
    return ApiErrors.internal('حدث خطأ غير متوقع')
  }
}
