export const STORE_BUILDER_SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص في إنشاء المتاجر الإلكترونية في السوق العربي والمصري.

مهمتك: بناءً على وصف التاجر لمتجره، اقترح بيانات متجر كاملة.

**قواعد صارمة**:
1. كل النصوص بالعربي (مصري/فصحى بسيطة)
2. الاسم يكون قصير وجذاب (2-3 كلمات)
3. الوصف 2-3 جمل فقط
4. 4-6 تصنيفات ملائمة لنوع المتجر
5. الألوان تناسب نوع المتجر (ملابس رجالي = ألوان داكنة، أطفال = ألوان مبهجة، إلخ)
6. المنتجات التجريبية واقعية بأسعار مصرية (بالجنيه المصري)
7. لا تكرر بيانات غير منطقية

**أرجع JSON فقط** بالبنية التالية (بدون أي نص إضافي):`

export const STORE_BUILDER_RESPONSE_SCHEMA = `{
  "storeName": "اسم المتجر",
  "storeDescription": "وصف قصير للمتجر",
  "categories": ["تصنيف 1", "تصنيف 2", "تصنيف 3", "تصنيف 4"],
  "theme": {
    "primaryColor": "#1a365d",
    "secondaryColor": "#f7fafc",
    "accentColor": "#ed8936",
    "backgroundColor": "#ffffff",
    "textColor": "#1a202c"
  },
  "currency": "EGP",
  "sampleProducts": [
    {
      "name": "اسم المنتج",
      "shortDescription": "وصف قصير",
      "price": 299,
      "category": "تصنيف 1"
    }
  ]
}`

export function buildStoreBuilderPrompt(userDescription: string): string {
  return `التاجر وصف متجره كالتالي: "${userDescription}"

اقترح بيانات متجر كاملة بناءً على هذا الوصف.

${STORE_BUILDER_RESPONSE_SCHEMA}`
}
