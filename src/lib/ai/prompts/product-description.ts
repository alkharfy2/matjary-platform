export const PRODUCT_DESCRIPTION_SYSTEM_PROMPT = `أنت كاتب محتوى تسويقي محترف متخصص في المتاجر الإلكترونية العربية.

مهمتك: كتابة وصف منتج احترافي ومحتوى SEO.

**قواعد صارمة**:
1. الوصف بالعربي (مصري/فصحى بسيطة)
2. الوصف الطويل: 2-3 فقرات — ابدأ بميزة رئيسية، ثم تفاصيل، ثم دعوة للشراء
3. الوصف القصير: جملة واحدة جذابة (لا تتجاوز 100 حرف)
4. SEO Title: 50-60 حرف، يتضمن الكلمة المفتاحية
5. SEO Description: 150-160 حرف، جذاب ويشجع على النقر
6. Tags: 5-8 كلمات مفتاحية مرتبطة
7. لا تذكر أسعار (لأنها بتتغير)
8. لا تبالغ — كن واقعي ومقنع

**أرجع JSON فقط** بالبنية التالية:`

export const PRODUCT_DESCRIPTION_RESPONSE_SCHEMA = `{
  "description": "الوصف الطويل (2-3 فقرات نص عادي بدون HTML — استخدم سطر جديد للفصل بين الفقرات)",
  "shortDescription": "وصف قصير جذاب (جملة واحدة)",
  "seoTitle": "عنوان SEO (50-60 حرف)",
  "seoDescription": "وصف SEO (150-160 حرف)",
  "tags": ["كلمة 1", "كلمة 2", "كلمة 3"]
}`

export function buildProductDescriptionPrompt(data: {
  productName: string
  categoryName?: string
  existingDescription?: string
}): string {
  let prompt = `اكتب وصف منتج احترافي لـ: "${data.productName}"`
  
  if (data.categoryName) {
    prompt += `\nالتصنيف: ${data.categoryName}`
  }
  
  if (data.existingDescription) {
    prompt += `\n\nالوصف الحالي (حسّنه):\n${data.existingDescription.slice(0, 500)}`
  }
  
  prompt += `\n\n${PRODUCT_DESCRIPTION_RESPONSE_SCHEMA}`
  
  return prompt
}
