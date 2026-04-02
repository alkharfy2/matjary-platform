import { NextRequest } from 'next/server'
import { openai, AI_MODEL } from '@/lib/ai/openai-client'

export const maxDuration = 30
import { AD_COPY_SYSTEM_PROMPT, buildAdCopyPrompt } from '@/lib/ai/prompts/ad-copy'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { ApiErrors } from '@/lib/api/response'
import { checkAiRateLimit, recordAiUsage } from '@/lib/ai/rate-limit'
import { z } from 'zod'
import type { AiAdCopyResponse } from '@/lib/ai/types'

const requestSchema = z.object({
  productName: z.string().min(2).max(200),
  price: z.number().positive(),
  description: z.string().max(2000).optional(),
  targetAudience: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    
    const rateCheck = await checkAiRateLimit(store.id, 'ad_copy', !store.isPaid)
    if (!rateCheck.allowed) {
      return ApiErrors.tooManyRequests(
        `تم تجاوز الحد اليومي (${rateCheck.limit} طلب). حاول بكرة.`
      )
    }
    
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة')
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
              { role: 'system', content: AD_COPY_SYSTEM_PROMPT },
              { 
                role: 'user', 
                content: buildAdCopyPrompt({
                  ...parsed.data,
                  currency: store.settings?.currency ?? 'EGP',
                }),
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
            max_tokens: 2000,
          })
          clearInterval(heartbeat)

          const content = completion.choices[0]?.message?.content
          if (!content) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في توليد المحتوى' })))
            controller.close()
            return
          }

          let result: AiAdCopyResponse
          try {
            result = JSON.parse(content) as AiAdCopyResponse
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في معالجة رد الذكاء الاصطناعي' })))
            controller.close()
            return
          }

          if (!result.facebook?.length || !result.tiktok?.length || !result.whatsapp) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'رد الذكاء الاصطناعي غير مكتمل — حاول تاني' })))
            controller.close()
            return
          }

          recordAiUsage(store.id, 'ad_copy', completion.usage?.total_tokens ?? 0).catch(() => {})

          controller.enqueue(encoder.encode(JSON.stringify({
            success: true,
            data: { ...result, remaining: rateCheck.remaining - 1 },
          })))
          controller.close()
        } catch (err) {
          clearInterval(heartbeat)
          const msg = err instanceof Error && err.message.includes('rate_limit')
            ? 'خدمة الذكاء الاصطناعي مشغولة — حاول بعد دقيقة'
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
      return ApiErrors.tooManyRequests('خدمة الذكاء الاصطناعي مشغولة — حاول بعد دقيقة')
    }
    return ApiErrors.internal('حدث خطأ غير متوقع')
  }
}
