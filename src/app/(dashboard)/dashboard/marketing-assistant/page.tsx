import { Metadata } from 'next'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyStoreOwnership } from '@/lib/api/auth'
import { MarketingAssistantClient } from './_components/marketing-assistant-client'

export const metadata: Metadata = {
  title: 'مساعد التسويق الذكي',
}

export default async function MarketingAssistantPage() {
  const { store } = await verifyStoreOwnership()
  if (!store) return null
  
  const products = await db
    .select({
      id: storeProducts.id,
      name: storeProducts.name,
      price: storeProducts.price,
      images: storeProducts.images,
      description: storeProducts.description,
      shortDescription: storeProducts.shortDescription,
    })
    .from(storeProducts)
    .where(and(
      eq(storeProducts.storeId, store.id),
      eq(storeProducts.isActive, true),
    ))
  
  const formattedProducts = products.map(p => ({
    ...p,
    price: parseFloat(p.price),
  }))
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 مساعد التسويق الذكي</h1>
        <p className="mt-1 text-gray-500">اختار منتج وخلّي الذكاء الاصطناعي يكتبلك نصوص إعلانات احترافية</p>
      </div>
      
      <MarketingAssistantClient products={formattedProducts} />
    </div>
  )
}
