'use client'

import { useState } from 'react'
import { Star, Loader2, CheckCircle } from 'lucide-react'

type OrderItem = {
  id: string
  productId: string
  name: string
  image: string | null
  quantity: number
}

type ItemReview = {
  productId: string
  rating: number
  comment: string
}

type TokenReviewFormProps = {
  token: string
  orderId: string
  storeId: string
  customerName: string
  items: OrderItem[]
}

export function TokenReviewForm({ token, items }: TokenReviewFormProps) {
  const [reviews, setReviews] = useState<Record<string, ItemReview>>(
    Object.fromEntries(items.map((item) => [item.productId, { productId: item.productId, rating: 5, comment: '' }]))
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const updateReview = (productId: string, field: keyof ItemReview, value: string | number) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId]!, [field]: value },
    }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/storefront/reviews/submit-by-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reviews: Object.values(reviews),
        }),
      })

      const json = await res.json()
      if (json.success) {
        setSubmitted(true)
      } else {
        setError(json.error || 'حدث خطأ')
      }
    } catch {
      setError('حدث خطأ في الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="surface-panel-elevated rounded-2xl p-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="mt-4 text-xl font-bold text-[var(--ds-text)]">شكراً لتقييمك! ⭐</h2>
        <p className="mt-2 text-[var(--ds-text-muted)]">رأيك مهم لنا ولعملائنا.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {items.map((item) => (
        <div key={item.productId} className="surface-panel-elevated rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            {item.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
            )}
            <div>
              <h3 className="font-semibold text-[var(--ds-text)]">{item.name}</h3>
              <p className="text-xs text-[var(--ds-text-soft)]">الكمية: {item.quantity}</p>
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">التقييم</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateReview(item.productId, 'rating', star)}
                  className="p-0.5"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (reviews[item.productId]?.rating ?? 5)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-200 hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">التعليق (اختياري)</label>
            <textarea
              value={reviews[item.productId]?.comment ?? ''}
              onChange={(e) => updateReview(item.productId, 'comment', e.target.value)}
              className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={3}
              placeholder="شاركنا تجربتك مع هذا المنتج..."
              maxLength={1000}
            />
          </div>
        </div>
      ))}

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary, #000)' }}
      >
        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Star className="h-5 w-5" />}
        {submitting ? 'جاري الإرسال...' : 'إرسال التقييمات'}
      </button>
    </div>
  )
}
