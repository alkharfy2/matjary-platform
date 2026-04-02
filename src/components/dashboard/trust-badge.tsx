'use client'

type TrustBadgeProps = {
  trustScore: number
  totalOrders: number
  completedOrders: number
  rejectedOrders: number
  isBlocked: boolean
  isNew: boolean
}

export function TrustBadge({
  trustScore,
  totalOrders,
  completedOrders,
  rejectedOrders,
  isBlocked,
  isNew,
}: TrustBadgeProps) {
  if (isNew) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
        🆕 عميل جديد
      </span>
    )
  }

  if (isBlocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
        🚫 محظور
      </span>
    )
  }

  const getLevel = () => {
    if (trustScore >= 80) return { label: 'عميل موثوق', color: 'bg-green-100 text-green-700', icon: '✅' }
    if (trustScore >= 50) return { label: 'عميل مشكوك فيه', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' }
    return { label: 'عميل عالي الخطورة', color: 'bg-red-100 text-red-700', icon: '🚫' }
  }

  const level = getLevel()

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${level.color}`}>
        {level.icon} {level.label} ({trustScore}%)
      </span>
      <span className="text-xs text-gray-500">
        {totalOrders} طلب — {completedOrders} تم التوصيل — {rejectedOrders} مرفوض
      </span>
    </div>
  )
}
