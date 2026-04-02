/** استجابة AI Store Builder */
export type AiStoreBuilderResponse = {
  storeName: string
  storeDescription: string
  categories: string[]
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
  }
  currency: 'EGP' | 'SAR' | 'AED' | 'USD'
  sampleProducts: Array<{
    name: string
    shortDescription: string
    price: number
    category: string
  }>
}

/** استجابة AI Product Description */
export type AiProductDescriptionResponse = {
  description: string
  shortDescription: string
  seoTitle: string
  seoDescription: string
  tags: string[]
}

/** استجابة AI Ad Copy */
export type AiAdCopyResponse = {
  facebook: string[]      // 3 نسخ مختلفة
  tiktok: string[]        // 2 نسخة
  whatsapp: string        // رسالة واحدة
  hashtags: string[]      // 10-15 هاشتاق
}

/** استجابة AI Insights */
export type AiInsight = {
  id: string
  emoji: string           // 💡 أو 📈 أو ⚠️ أو 🎯
  type: 'tip' | 'warning' | 'achievement' | 'opportunity'
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export type AiInsightsResponse = {
  insights: AiInsight[]
  generatedAt: string     // ISO date
}
