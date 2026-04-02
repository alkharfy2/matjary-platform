'use client'

import { useState, useEffect } from 'react'
import { GitCompareArrows } from 'lucide-react'
import { useCompareStore } from '@/lib/stores/compare-store'

type CompareButtonProps = {
  productId: string
  size?: 'sm' | 'md'
}

export function CompareButton({ productId, size = 'sm' }: CompareButtonProps) {
  const { addItem, removeItem, isInCompare, isFull } = useCompareStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const inCompare = isInCompare(productId)
  const full = isFull()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (inCompare) {
      removeItem(productId)
    } else if (!full) {
      addItem(productId)
    }
  }

  const sizeClasses = size === 'sm'
    ? 'h-8 w-8'
    : 'h-10 w-10'

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'

  return (
    <button
      onClick={handleClick}
      disabled={!inCompare && full}
      title={inCompare ? 'إزالة من المقارنة' : full ? 'الحد الأقصى للمقارنة' : 'أضف للمقارنة'}
      className={`flex items-center justify-center rounded-full border shadow-[var(--ds-shadow-sm)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses} ${
        inCompare
          ? 'border-[var(--color-primary,#000)] bg-[var(--color-primary,#000)] text-white'
          : 'border-[var(--ds-divider)] bg-white/90 text-[var(--ds-text-muted)] backdrop-blur-sm hover:border-[var(--color-primary,#000)] hover:text-[var(--color-primary,#000)]'
      }`}
    >
      <GitCompareArrows className={iconSize} />
    </button>
  )
}
