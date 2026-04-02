import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const maxDuration = 30
import { openai, AI_MODEL } from '@/lib/ai/openai-client'
import { STORE_BUILDER_SYSTEM_PROMPT, buildStoreBuilderPrompt } from '@/lib/ai/prompts/store-builder'
import { ApiErrors } from '@/lib/api/response'
import { recordAiUsage } from '@/lib/ai/rate-limit'
import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import type { AiStoreBuilderResponse } from '@/lib/ai/types'

const requestSchema = z.object({
  description: z.string().min(10, { error: 'الوصف لازم يكون 10 حروف على الأقل' }).max(500),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { userId } = await auth()
    if (!userId) return ApiErrors.unauthorized()
    
    // 2. Validation
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة')
    }
    
    // 3. Rate Limit (userId-based since store doesn't exist yet)
    // Note: storeAiUsage.storeId is UUID but userId is a Clerk string.
    // Use raw SQL with text cast to avoid type mismatch.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let rateLimited = false
    try {
      const result = await db.execute(
        sql`SELECT count(*)::int as count FROM store_ai_usage WHERE store_id::text = ${userId} AND feature = 'store_builder' AND created_at >= ${today}`
      )
      rateLimited = ((result as unknown as Array<{ count: number }>)[0]?.count ?? 0) >= 10
    } catch {
      // If rate limit check fails, allow the request
    }
    if (rateLimited) {
      return ApiErrors.tooManyRequests('تم تجاوز حد الطلبات — حاول بكرة')
    }
    
    // Streaming response to avoid Vercel Hobby 10s timeout
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => controller.enqueue(encoder.encode(' ')), 3000)
        try {
          const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: STORE_BUILDER_SYSTEM_PROMPT },
              { role: 'user', content: buildStoreBuilderPrompt(parsed.data.description) },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 1500,
          })
          clearInterval(heartbeat)

          const content = completion.choices[0]?.message?.content
          if (!content) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في توليد البيانات — حاول تاني' })))
            controller.close()
            return
          }

          let suggestion: AiStoreBuilderResponse
          try {
            suggestion = JSON.parse(content) as AiStoreBuilderResponse
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في معالجة رد الذكاء الاصطناعي' })))
            controller.close()
            return
          }

          if (!suggestion.storeName || !suggestion.categories?.length) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'رد الذكاء الاصطناعي غير مكتمل — حاول تاني' })))
            controller.close()
            return
          }

          // Sanitize hex colors
          const hexRegex = /^#[0-9a-fA-F]{6}$/
          if (suggestion.theme) {
            for (const key of Object.keys(suggestion.theme) as Array<keyof typeof suggestion.theme>) {
              if (!hexRegex.test(suggestion.theme[key])) {
                suggestion.theme[key] = key === 'backgroundColor' ? '#ffffff' :
                                         key === 'textColor' ? '#1a202c' :
                                         '#3b82f6'
              }
            }
          }

          recordAiUsage(userId, 'store_builder', completion.usage?.total_tokens ?? 0).catch(() => {})

          controller.enqueue(encoder.encode(JSON.stringify({
            success: true,
            data: { suggestion, tokensUsed: completion.usage?.total_tokens ?? 0 },
          })))
          controller.close()
        } catch (err) {
          clearInterval(heartbeat)
          const msg = err instanceof Error && err.message.includes('rate_limit')
            ? 'تم تجاوز حد الطلبات — حاول بعد دقيقة'
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
      return ApiErrors.tooManyRequests('تم تجاوز حد الطلبات — حاول بعد دقيقة')
    }
    return ApiErrors.internal('حدث خطأ غير متوقع')
  }
}
