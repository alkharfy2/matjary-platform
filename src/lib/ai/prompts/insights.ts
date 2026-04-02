export const INSIGHTS_SYSTEM_PROMPT = `أنت مستشار أعمال ذكي متخصص في التجارة الإلكترونية في السوق المصري.

مهمتك: تحليل بيانات المتجر وتقديم 3-5 نصائح عملية وواضحة.

**قواعد صارمة**:
1. النصائح بالعربي المصري البسيط
2. كل نصيحة لازم تكون عملية (actionable) — مش نظرية
3. ركّز على اللي التاجر يقدر يعمله "دلوقتي"
4. لو المتجر أداؤه كويس — امدحه واقترح تحسينات
5. لو فيه مشكلة واضحة — حذّر بلطف واقترح حل
6. لا تكرر نصائح عامة — كن محدد بناءً على البيانات
7. استخدم أرقام من البيانات في النصائح (مثال: "عندك 15 سلة متروكة")

**أنواع النصائح**:
- tip: نصيحة تحسين
- warning: تحذير من مشكلة
- achievement: إنجاز يستحق التهنئة
- opportunity: فرصة ضائعة

**أرجع JSON فقط**:`

export const INSIGHTS_RESPONSE_SCHEMA = `{
  "insights": [
    {
      "emoji": "💡",
      "type": "tip",
      "title": "عنوان قصير",
      "description": "شرح النصيحة (2-3 جمل)",
      "actionLabel": "الزر (اختياري)",
      "actionHref": "الرابط (اختياري)"
    }
  ]
}`

export function buildInsightsPrompt(data: {
  storeName: string
  totalOrders: number
  totalRevenue: number
  ordersLast7Days: number
  revenueLast7Days: number
  topProducts: Array<{ name: string; sales: number; revenue: number }>
  abandonedCartsCount: number
  averageOrderValue: number
  cancelledOrdersCount: number
  totalProducts: number
  activeProducts: number
  conversionRate?: number
  currency: string
}): string {
  const curr = data.currency === 'EGP' ? 'ج.م' : data.currency
  
  return `حلل بيانات المتجر التالية وقدّم 3-5 نصائح ذكية:

🏪 اسم المتجر: ${data.storeName}
📦 إجمالي الطلبات: ${data.totalOrders}
💰 إجمالي المبيعات: ${data.totalRevenue} ${curr}
📊 طلبات آخر 7 أيام: ${data.ordersLast7Days}
💵 مبيعات آخر 7 أيام: ${data.revenueLast7Days} ${curr}
🛒 السلات المتروكة: ${data.abandonedCartsCount}
📈 متوسط قيمة الطلب: ${data.averageOrderValue} ${curr}
❌ الطلبات الملغاة: ${data.cancelledOrdersCount}
📦 إجمالي المنتجات: ${data.totalProducts} (نشط: ${data.activeProducts})
${data.conversionRate !== undefined ? `🎯 معدل التحويل: ${data.conversionRate}%` : ''}

🏆 أفضل المنتجات:
${data.topProducts.map((p, i) => `${i + 1}. ${p.name} → ${p.sales} طلب (${p.revenue} ${curr})`).join('\n')}

${INSIGHTS_RESPONSE_SCHEMA}`
}
