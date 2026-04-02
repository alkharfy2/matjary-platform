export const maxDuration = 30
import { NextRequest } from 'next/server'
import { openai, AI_MODEL } from '@/lib/ai/openai-client'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { ApiErrors } from '@/lib/api/response'
import { checkAiRateLimit, recordAiUsage } from '@/lib/ai/rate-limit'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { z } from 'zod'

const generateSchema = z.object({
  title: z.string().min(2, { error: 'العنوان مطلوب' }).max(200),
  keywords: z.string().max(300).optional(),
  tone: z.enum(['professional', 'friendly', 'promotional', 'educational']).default('professional'),
})

export async function POST(request: NextRequest) {
  try {
    const { store } = await verifyStoreOwnership()
    if (!store) return ApiErrors.unauthorized()

    const rateCheck = await checkAiRateLimit(store.id, 'insights', !store.isPaid)
    if (!rateCheck.allowed) {
      return ApiErrors.tooManyRequests(
        `تم تجاوز الحد اليومي (${rateCheck.limit} طلب). حاول بكرة أو اشترك في خطة أعلى.`
      )
    }

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return ApiErrors.validation(parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة')
    }

    const { title, keywords, tone } = parsed.data

    const toneMap = {
      professional: 'رسمي واحترافي',
      friendly: 'ودي وقريب من القارئ',
      promotional: 'تسويقي وجذاب',
      educational: 'تعليمي ومعلوماتي',
    }

    const prompt = `أنت كاتب محتوى محترف. اكتب مقالة مدونة عن "${title}".
${keywords ? `الكلمات المفتاحية: ${keywords}` : ''}
النبرة: ${toneMap[tone]}
اكتب بالعربية. المقالة لازم تكون:
- 500-800 كلمة
- مقسمة لأقسام بعناوين فرعية (استخدم <h2> و <h3>)
- تحتوي على نصائح عملية
- محسنة لمحركات البحث
- المحتوى بصيغة HTML بسيط (p, h2, h3, ul, li, strong, em)

أرجع الناتج بصيغة JSON:
{
  "content": "HTML content...",
  "excerpt": "ملخص قصير 2-3 أسطر",
  "seoTitle": "عنوان SEO (أقل من 60 حرف)",
  "seoDescription": "وصف SEO (أقل من 160 حرف)"
}`

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        const heartbeat = setInterval(() => controller.enqueue(encoder.encode(' ')), 3000)
        try {
          const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
              { role: 'system', content: 'أنت كاتب محتوى عربي محترف متخصص في كتابة مقالات المدونات. ترجع JSON فقط.' },
              { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 2000,
          })
          clearInterval(heartbeat)

          const content = completion.choices[0]?.message?.content
          if (!content) {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في توليد المحتوى' })))
            controller.close()
            return
          }

          let result: { content: string; excerpt: string; seoTitle: string; seoDescription: string }
          try {
            result = JSON.parse(content)
          } catch {
            controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'فشل في معالجة رد الذكاء الاصطناعي' })))
            controller.close()
            return
          }

          result.content = sanitizeHtml(result.content)

          await recordAiUsage(store.id, 'insights', completion.usage?.total_tokens ?? 0)

          controller.enqueue(encoder.encode(JSON.stringify({ success: true, data: result })))
          controller.close()
        } catch (err) {
          clearInterval(heartbeat)
          controller.enqueue(encoder.encode(JSON.stringify({ success: false, error: 'حدث خطأ أثناء توليد المحتوى' })))
          controller.close()
          console.error('Blog AI generate error:', err)
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    })
  } catch {
    return ApiErrors.internal()
  }
}
