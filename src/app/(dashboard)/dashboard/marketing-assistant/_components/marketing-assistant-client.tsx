'use client'

import { useState } from 'react'
import type { AiAdCopyResponse } from '@/lib/ai/types'

type Product = {
  id: string
  name: string
  price: number
  images: string[]
  description?: string | null
  shortDescription?: string | null
}

type MarketingAssistantClientProps = {
  products: Product[]
}

export function MarketingAssistantClient({ products }: MarketingAssistantClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [targetAudience, setTargetAudience] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<AiAdCopyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)
  
  const handleGenerate = async () => {
    if (!selectedProduct) return
    
    setLoading(true)
    setError(null)
    setResults(null)
    
    try {
      const res = await fetch('/api/dashboard/products/ai-ad-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: selectedProduct.name,
          price: selectedProduct.price,
          description: selectedProduct.description ?? selectedProduct.shortDescription,
          targetAudience: targetAudience || undefined,
        }),
      })
      
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'حدث خطأ')
        return
      }
      
      setResults(data.data)
    } catch {
      setError('فشل الاتصال — تأكد من الإنترنت')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(key)
    setTimeout(() => setCopiedIndex(null), 2000)
  }
  
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* الإدخال */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">1. اختار المنتج</h2>
        
        <select
          value={selectedProduct?.id ?? ''}
          onChange={(e) => {
            const product = products.find(p => p.id === e.target.value)
            setSelectedProduct(product ?? null)
          }}
          className="mb-4 w-full rounded-lg border p-3"
        >
          <option value="">— اختار منتج —</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} — {p.price} ج.م</option>
          ))}
        </select>
        
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-500">
            الجمهور المستهدف (اختياري)
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="مثال: شباب 18-30 سنة في مصر مهتمين بالموضة"
            className="w-full rounded-lg border p-3 text-right"
            dir="rtl"
          />
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={!selectedProduct || loading}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري إنشاء النصوص...
            </span>
          ) : '✨ اكتب نصوص الإعلانات'}
        </button>
        
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
      
      {/* النتائج */}
      <div className="space-y-4">
        {!results && !loading && (
          <div className="flex h-full items-center justify-center rounded-xl border bg-gray-50 p-12 text-center">
            <div>
              <p className="mb-2 text-4xl">📝</p>
              <p className="text-gray-400">اختار منتج واضغط &ldquo;اكتب نصوص الإعلانات&rdquo;</p>
            </div>
          </div>
        )}
        
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border bg-white p-6">
                <div className="mb-3 h-4 w-24 rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 rounded bg-gray-200" />
                  <div className="h-3 w-3/4 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            {/* Facebook */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-600">
                📘 Facebook / Instagram
              </h3>
              <div className="space-y-3">
                {results.facebook.map((text, i) => (
                  <div key={`fb-${i}`} className="group relative rounded-lg bg-blue-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
                    <button
                      onClick={() => handleCopy(text, `fb-${i}`)}
                      className="absolute left-2 top-2 rounded bg-white px-2 py-1 text-xs opacity-0 shadow transition-opacity group-hover:opacity-100"
                    >
                      {copiedIndex === `fb-${i}` ? '✅ تم النسخ' : '📋 نسخ'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* TikTok */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                🎵 TikTok
              </h3>
              <div className="space-y-3">
                {results.tiktok.map((text, i) => (
                  <div key={`tt-${i}`} className="group relative rounded-lg bg-gray-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
                    <button
                      onClick={() => handleCopy(text, `tt-${i}`)}
                      className="absolute left-2 top-2 rounded bg-white px-2 py-1 text-xs opacity-0 shadow transition-opacity group-hover:opacity-100"
                    >
                      {copiedIndex === `tt-${i}` ? '✅ تم النسخ' : '📋 نسخ'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* WhatsApp */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-green-600">
                📱 WhatsApp
              </h3>
              <div className="group relative rounded-lg bg-green-50 p-4">
                <p className="whitespace-pre-line text-sm leading-relaxed">{results.whatsapp}</p>
                <button
                  onClick={() => handleCopy(results.whatsapp, 'wa')}
                  className="absolute left-2 top-2 rounded bg-white px-2 py-1 text-xs opacity-0 shadow transition-opacity group-hover:opacity-100"
                >
                  {copiedIndex === 'wa' ? '✅ تم النسخ' : '📋 نسخ'}
                </button>
              </div>
            </div>
            
            {/* Hashtags */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold">
                #️⃣ هاشتاقات
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.hashtags.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => handleCopy(tag, `tag-${i}`)}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600 transition-colors hover:bg-gray-200"
                    title="اضغط للنسخ"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleCopy(results.hashtags.join(' '), 'all-tags')}
                className="mt-3 text-xs text-blue-600 hover:underline"
              >
                {copiedIndex === 'all-tags' ? '✅ تم نسخ الكل' : '📋 نسخ كل الهاشتاقات'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
