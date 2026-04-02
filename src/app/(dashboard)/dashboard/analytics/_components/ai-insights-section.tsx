'use client'

import { useEffect, useState } from 'react'
import type { AiInsightsResponse, AiInsight } from '@/lib/ai/types'
import Link from 'next/link'

export function AiInsightsSection() {
  const [data, setData] = useState<AiInsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchInsights()
  }, [])
  
  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/dashboard/ai-insights')
      const json = await res.json()
      
      if (!json.success) {
        setError(json.error ?? 'فشل في جلب النصائح')
        return
      }
      
      setData(json.data)
    } catch {
      setError('فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }
  
  const typeStyles: Record<AiInsight['type'], string> = {
    tip: 'border-blue-200 bg-blue-50',
    warning: 'border-orange-200 bg-orange-50',
    achievement: 'border-green-200 bg-green-50',
    opportunity: 'border-purple-200 bg-purple-50',
  }
  
  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-bold">نصائح ذكية</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 rounded bg-gray-200" />
              <div className="mt-1 h-3 w-2/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <span>🤖</span>
          <p className="text-sm">{error}</p>
          <button onClick={fetchInsights} className="text-sm text-blue-600 hover:underline">
            حاول تاني
          </button>
        </div>
      </div>
    )
  }
  
  if (!data?.insights?.length) return null
  
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-bold">نصائح ذكية</h3>
        </div>
        {data.generatedAt && (
          <span className="text-xs text-gray-400">
            آخر تحديث: {new Date(data.generatedAt).toLocaleDateString('ar-EG')}
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {data.insights.map((insight) => (
          <div
            key={insight.id}
            className={`rounded-lg border p-4 ${typeStyles[insight.type]}`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span>{insight.emoji}</span>
              <h4 className="font-medium">{insight.title}</h4>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">{insight.description}</p>
            {insight.actionLabel && insight.actionHref && (
              <Link
                href={insight.actionHref}
                className="mt-2 inline-block rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
              >
                {insight.actionLabel} →
              </Link>
            )}
          </div>
        ))}
      </div>
      
      <button
        onClick={fetchInsights}
        className="mt-4 w-full rounded-lg border border-dashed py-2 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-500"
      >
        🔄 تحديث النصائح
      </button>
    </div>
  )
}
