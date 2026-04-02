import { NextRequest } from 'next/server'
import { openai, AI_MODEL } from '@/lib/ai/openai-client'

export const maxDuration = 30
import { PRODUCT_DESCRIPTION_SYSTEM_PROMPT, buildProductDescriptionPrompt } from '@/lib/ai/prompts/product-description'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { ApiErrors } from '@/lib/api/response'
import { checkAiRateLimit, recordAiUsage } from '@/lib/ai/rate-limit'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { z } from 'zod'
import type { AiProductDescriptionResponse } from '@/lib/ai/types'

const requestSchema = z.object({
  productName: z.string().min(2, { error: 'اسم المنتج مطلوب' }).max(200),
  categoryName: z.string().max(100).optional(),
  existingDescription: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()
    
    // 2. Rate limit
    const rateCheck = await checkAiRateLimit(
      store.id,
      'product_description',
      !store.isPaid,
    )
    if (!rateCheck.allowed) {
      return ApiErrors.tooManyRequests(
        `تم تجاوز الحد اليومي (${rateCheck.limit} طلب). حاول بكرة أو اشترك في خطة أعلى.`
      )
    }
    
    // 3. Validation
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
              { role: 'system', content: PRODUCT_DESCRIPTION_SYSTEM_PROMPT },
              { role: 'user', content: buildProductDescriptionPrompt(parsed.data) },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 1000,
          })
          clearInterval(heartbeat)

          const content = completion.choices[0]?.message?.content
          if (!content) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في توليد الوصف — حاول تاني' })))
            controller.close()
            return
          }

          let result: AiProductDescriptionResponse
          try {
            result = JSON.parse(content) as AiProductDescriptionResponse
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في معالجة رد الذكاء الاصطناعي' })))
            controller.close()
            return
          }

          // Sanitize HTML
          result.description = sanitizeHtml(result.description)

          recordAiUsage(store.id, 'product_description', completion.usage?.total_tokens ?? 0).catch(() => {})

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
