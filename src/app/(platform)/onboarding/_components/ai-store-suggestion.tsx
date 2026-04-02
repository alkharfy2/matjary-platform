'use client'

import { useState } from 'react'
import type { AiStoreBuilderResponse } from '@/lib/ai/types'

type AiStoreSuggestionProps = {
  onAccept: (suggestion: AiStoreBuilderResponse) => void
  onSkip: () => void
}

export function AiStoreSuggestion({ onAccept, onSkip }: AiStoreSuggestionProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<AiStoreBuilderResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const handleGenerate = async () => {
    if (!description.trim() || description.length < 10) {
      setError('اكتب وصف أطول لمتجرك (10 حروف على الأقل)')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/stores/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      
      const data = await res.json()
      
      if (!data.success) {
        setError(data.error ?? 'حدث خطأ — حاول تاني')
        return
      }
      
      setSuggestion(data.data.suggestion)
    } catch {
      setError('فشل الاتصال — تأكد من الإنترنت')
    } finally {
      setLoading(false)
    }
  }
  
  // === حالة الإدخال (قبل التوليد) ===
  if (!suggestion) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-4 text-5xl">✨</div>
        <h2 className="mb-2 text-2xl font-bold">خلّي الذكاء الاصطناعي يساعدك</h2>
        <p className="mb-6 text-gray-500">صف متجرك في جملة وسيبنا نجهزلك كل حاجة</p>
        
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثال: بابيع ملابس رجالي عصرية بأسعار مناسبة في مصر"
          className="mb-3 w-full rounded-lg border p-4 text-right leading-relaxed"
          rows={3}
          maxLength={500}
          dir="rtl"
        />
        
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleGenerate}
            disabled={loading || description.length < 10}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري التفكير...
              </span>
            ) : '🤖 اقترح لي'}
          </button>
          <button
            onClick={onSkip}
            className="rounded-lg border px-6 py-3 text-gray-500 transition-colors hover:bg-gray-50"
          >
            ⏩ أريد إعداده يدوياً
          </button>
        </div>
      </div>
    )
  }
  
  // === حالة عرض الاقتراح ===
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mb-2 text-4xl">🎉</div>
        <h2 className="text-2xl font-bold">جهزنالك متجرك!</h2>
        <p className="text-gray-500">راجع الاقتراحات وعدّل اللي محتاج تغييره</p>
      </div>
      
      <div className="space-y-4 rounded-xl border bg-white p-6">
        {/* اسم المتجر */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-500">📛 اسم المتجر</label>
          <input
            type="text"
            value={suggestion.storeName}
            onChange={(e) => setSuggestion({ ...suggestion, storeName: e.target.value })}
            className="w-full rounded-lg border p-2 text-right font-medium"
            dir="rtl"
          />
        </div>
        
        {/* وصف المتجر */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-500">📝 وصف المتجر</label>
          <textarea
            value={suggestion.storeDescription}
            onChange={(e) => setSuggestion({ ...suggestion, storeDescription: e.target.value })}
            className="w-full rounded-lg border p-2 text-right"
            rows={2}
            dir="rtl"
          />
        </div>
        
        {/* التصنيفات */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-500">🏷️ التصنيفات</label>
          <div className="flex flex-wrap gap-2">
            {suggestion.categories.map((cat, i) => (
              <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                {cat}
              </span>
            ))}
          </div>
        </div>
        
        {/* الألوان */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-500">🎨 الألوان</label>
          <div className="flex gap-3">
            {Object.entries(suggestion.theme).slice(0, 3).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-400">{color}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* منتجات تجريبية */}
        {suggestion.sampleProducts.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">📦 منتجات تجريبية</label>
            <div className="space-y-2">
              {suggestion.sampleProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span>{product.name}</span>
                  <span className="font-medium">{product.price} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => onAccept(suggestion)}
          className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
        >
          ✅ ابدأ بهذه الإعدادات
        </button>
        <button
          onClick={() => { setSuggestion(null); setDescription('') }}
          className="rounded-lg border px-6 py-3 text-gray-500 transition-colors hover:bg-gray-50"
        >
          🔄 اقترح تاني
        </button>
      </div>
    </div>
  )
}
