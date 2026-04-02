'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, ThumbsUp, CheckCircle } from 'lucide-react'

type Review = {
  id: string
  customerName: string
  rating: number
  comment: string | null
  images: string[]
  isVerifiedPurchase: boolean
  merchantReply: string | null
  helpfulCount: number
  createdAt: string
}

type ReviewSummary = {
  avgRating: number
  totalCount: number
  verifiedCount: number
  ratingDistribution: Record<number, number>
}

type ProductReviewsProps = {
  productId: string
  storeSlug: string
  currency: string
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-center text-xs text-[var(--ds-text-muted)]">{rating}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-end text-xs text-[var(--ds-text-soft)]">{count}</span>
    </div>
  )
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [formData, setFormData] = useState({ customerName: '', rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const fetchReviews = useCallback(async (ratingFilter?: number | null) => {
    try {
      const filterParam = ratingFilter ? `&rating=${ratingFilter}` : ''
      const res = await fetch(`/api/storefront/reviews?productId=${productId}${filterParam}`)
      const json = await res.json()
      if (json.success) {
        setReviews(json.data.reviews)
        setSummary(json.data.summary)
      }
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const handleSubmit = async () => {
    if (!formData.customerName.trim() || submitting) return
    setSubmitting(true)
    setSubmitMessage('')
    try {
      const res = await fetch('/api/storefront/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ...formData,
          comment: formData.comment || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSubmitMessage(json.data.message)
        setShowForm(false)
        setFormData({ customerName: '', rating: 5, comment: '' })
        fetchReviews()
      } else {
        setSubmitMessage(json.error || 'حدث خطأ')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleHelpful = async (reviewId: string) => {
    await fetch(`/api/storefront/reviews/${reviewId}/helpful`, { method: 'POST' })
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="h-20 rounded bg-gray-100" />
      </div>
    )
  }

  return (
    <section className="mt-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--ds-text)] md:text-2xl">
          التقييمات {summary && summary.totalCount > 0 && `(${summary.totalCount})`}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          {showForm ? 'إلغاء' : 'أضف تقييم'}
        </button>
      </div>

      {/* Summary */}
      {summary && summary.totalCount > 0 && (
        <div className="surface-panel-elevated flex flex-col gap-6 rounded-2xl p-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black text-[var(--ds-text)]">{summary.avgRating}</span>
            <StarRating rating={Math.round(summary.avgRating)} size="lg" />
            <span className="text-xs text-[var(--ds-text-soft)]">{summary.totalCount} تقييم</span>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <RatingBar key={r} rating={r} count={summary.ratingDistribution[r] ?? 0} total={summary.totalCount} />
            ))}
          </div>
        </div>
      )}

      {/* Rating filter */}
      {summary && summary.totalCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFilterRating(null); fetchReviews(null) }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filterRating === null
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)]'
            }`}
          >
            الكل ({summary.totalCount})
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            (summary.ratingDistribution[r] ?? 0) > 0 ? (
              <button
                key={r}
                onClick={() => { setFilterRating(r); fetchReviews(r) }}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filterRating === r
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)]'
                }`}
              >
                {r} <Star className="h-3 w-3 fill-current" /> ({summary.ratingDistribution[r]})
              </button>
            ) : null
          ))}
        </div>
      )}

      {/* Submit form */}
      {showForm && (
        <div className="surface-panel-elevated space-y-4 rounded-2xl p-5">
          <h3 className="font-semibold text-[var(--ds-text)]">أضف تقييمك</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">الاسم</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData((f) => ({ ...f, customerName: e.target.value }))}
                className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                placeholder="اسمك"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">التقييم</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFormData((f) => ({ ...f, rating: star }))}
                    className="p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        star <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 hover:text-amber-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--ds-text-muted)]">التعليق (اختياري)</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData((f) => ({ ...f, comment: e.target.value }))}
                className="w-full rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                rows={3}
                placeholder="شاركنا تجربتك..."
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!formData.customerName.trim() || submitting}
              className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </button>
          </div>
          {submitMessage && (
            <p className="text-sm text-green-600">{submitMessage}</p>
          )}
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="surface-panel-elevated space-y-3 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--ds-text)]">{review.customerName}</span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" /> مشتري مؤكد
                      </span>
                    )}
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                <span className="text-xs text-[var(--ds-text-soft)]">
                  {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                </span>
              </div>
              {review.comment && (
                <p className="text-sm leading-relaxed text-[var(--ds-text-muted)]">{review.comment}</p>
              )}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2">
                  {review.images.map((img, i) => (
                    <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ))}
                </div>
              )}
              {review.merchantReply && (
                <div className="rounded-xl bg-[var(--ds-surface-muted)] p-3">
                  <p className="text-xs font-semibold text-[var(--color-primary)]">رد المتجر:</p>
                  <p className="text-sm text-[var(--ds-text-muted)]">{review.merchantReply}</p>
                </div>
              )}
              <button
                onClick={() => handleHelpful(review.id)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-[var(--ds-text-soft)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                مفيد {review.helpfulCount > 0 && `(${review.helpfulCount})`}
              </button>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="surface-panel-elevated rounded-2xl p-8 text-center">
          <Star className="mx-auto h-10 w-10 text-gray-200" />
          <p className="mt-2 text-sm text-[var(--ds-text-muted)]">لا توجد تقييمات بعد. كن أول من يقيّم!</p>
        </div>
      ) : null}
    </section>
  )
}
