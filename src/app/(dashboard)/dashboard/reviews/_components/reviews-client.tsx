'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, Check, X, MessageSquare, ThumbsUp, Trash2, Search } from 'lucide-react'
import { Button, Card, Input, Textarea } from '@/components/ui'
import { PageHeader, EmptyState, StatCard } from '@/components/patterns'

type Review = {
  id: string
  customerName: string
  customerPhone: string | null
  rating: number
  comment: string | null
  images: string[]
  isVerifiedPurchase: boolean
  isApproved: boolean
  merchantReply: string | null
  merchantReplyAt: string | null
  helpfulCount: number
  createdAt: string
  product: { id: string; name: string; images: string[]; slug: string } | null
}

type Stats = {
  totalReviews: number
  pendingCount: number
  avgRating: number
}

export function ReviewsClient({ storeId: _storeId }: { storeId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<Stats>({ totalReviews: 0, pendingCount: 0, avgRating: 0 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'all' | 'pending' | 'approved'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status })
      if (search) params.set('search', search)

      const res = await fetch(`/api/dashboard/reviews?${params}`)
      const json = await res.json()
      if (json.success) {
        setReviews(json.data.reviews)
        setTotal(json.data.total)
        setStats(json.data.stats)
      }
    } finally {
      setLoading(false)
    }
  }, [page, status, search])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  const handleAction = async (reviewId: string, action: 'approve' | 'reject' | 'delete' | 'reply') => {
    setActionLoading(reviewId)
    try {
      if (action === 'delete') {
        await fetch(`/api/dashboard/reviews/${reviewId}`, { method: 'DELETE' })
      } else if (action === 'reply') {
        await fetch(`/api/dashboard/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantReply: replyText }),
        })
        setReplyingTo(null)
        setReplyText('')
      } else {
        await fetch(`/api/dashboard/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isApproved: action === 'approve' }),
        })
      }
      fetchReviews()
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقييمات"
        description="إدارة تقييمات العملاء على منتجاتك"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي التقييمات" value={String(stats.totalReviews)} icon={<Star className="h-5 w-5" />} />
        <StatCard label="في انتظار المراجعة" value={String(stats.pendingCount)} icon={<MessageSquare className="h-5 w-5" />} />
        <StatCard label="متوسط التقييم" value={`${stats.avgRating} / 5`} icon={<ThumbsUp className="h-5 w-5" />} />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="بحث بالاسم..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="ps-9"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'approved'] as const).map((s) => (
              <Button
                key={s}
                variant={status === s ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => { setStatus(s); setPage(1) }}
              >
                {s === 'all' ? 'الكل' : s === 'pending' ? 'في الانتظار' : 'موافق عليه'}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse p-6">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          title="لا توجد تقييمات"
          description="عندما يقيّم العملاء منتجاتك ستظهر هنا"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{review.customerName}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    {review.isVerifiedPurchase && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        مشتري مؤكد ✅
                      </span>
                    )}
                    {!review.isApproved && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        في الانتظار
                      </span>
                    )}
                  </div>
                  {review.product && (
                    <p className="text-sm text-gray-500">المنتج: {review.product.name}</p>
                  )}
                  {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.images.map((img, i) => (
                        <img key={i} src={img} alt={`صورة ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                  {review.merchantReply && (
                    <div className="mt-2 rounded-lg bg-blue-50 p-3">
                      <p className="text-xs font-semibold text-blue-700">رد التاجر:</p>
                      <p className="text-sm text-blue-800">{review.merchantReply}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5">
                  {!review.isApproved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(review.id, 'approve')}
                      disabled={actionLoading === review.id}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  )}
                  {review.isApproved && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(review.id, 'reject')}
                      disabled={actionLoading === review.id}
                    >
                      <X className="h-4 w-4 text-amber-600" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setReplyingTo(replyingTo === review.id ? null : review.id); setReplyText(review.merchantReply ?? '') }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction(review.id, 'delete')}
                    disabled={actionLoading === review.id}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Reply form */}
              {replyingTo === review.id && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <Textarea
                    placeholder="اكتب ردك على التقييم..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAction(review.id, 'reply')}
                      disabled={!replyText.trim() || actionLoading === review.id}
                    >
                      إرسال الرد
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            السابق
          </Button>
          <span className="text-sm text-gray-500">
            صفحة {page} من {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
