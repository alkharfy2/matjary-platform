export const AD_COPY_SYSTEM_PROMPT = `أنت خبير تسويق رقمي متخصص في السوق المصري والعربي.

مهمتك: كتابة نصوص إعلانات جذابة لمنصات التواصل الاجتماعي.

**قواعد صارمة**:
1. النصوص بالعربي المصري (مش فصحى ثقيلة)
2. Facebook/Instagram: 3 نسخ مختلفة (قصير، متوسط، طويل)
   - القصير: 2-3 سطور + CTA
   - المتوسط: 4-6 سطور + emoji + CTA
   - الطويل: 8-10 سطور مع storytelling + CTA
3. TikTok: 2 نسخ (caption قصير + hook قوي)
   - Caption: سطر أو اتنين max
   - Hook: جملة opening جذابة للفيديو
4. WhatsApp: رسالة تسويقية واحدة (3-5 سطور) مع emoji
5. هاشتاقات: 10-15 هاشتاق مرتبط (مزيج عربي وإنجليزي)
6. استخدم emoji بشكل طبيعي (مش مبالغ فيه)
7. ركّز على: الفائدة → العرض → الـ CTA

**أرجع JSON فقط**:`

export const AD_COPY_RESPONSE_SCHEMA = `{
  "facebook": [
    "نسخة قصيرة...",
    "نسخة متوسطة...",
    "نسخة طويلة..."
  ],
  "tiktok": [
    "caption قصير...",
    "hook + caption..."
  ],
  "whatsapp": "رسالة تسويقية كاملة...",
  "hashtags": ["#هاشتاق1", "#هاشتاق2", "..."]
}`

export function buildAdCopyPrompt(data: {
  productName: string
  price: number
  description?: string
  targetAudience?: string
  currency?: string
}): string {
  const curr = data.currency === 'EGP' ? 'جنيه مصري' :
               data.currency === 'SAR' ? 'ريال سعودي' :
               data.currency === 'AED' ? 'درهم إماراتي' : 'دولار'
  
  let prompt = `اكتب نصوص إعلانات لمنتج: "${data.productName}"\nالسعر: ${data.price} ${curr}`
  
  if (data.description) {
    prompt += `\nوصف المنتج: ${data.description.slice(0, 300)}`
  }
  
  if (data.targetAudience) {
    prompt += `\nالجمهور المستهدف: ${data.targetAudience}`
  }
  
  prompt += `\n\n${AD_COPY_RESPONSE_SCHEMA}`
  
  return prompt
}
