'use client'

import { useEffect } from 'react'
import { useRecentlyViewedStore } from '@/lib/stores/recently-viewed-store'

export function TrackRecentlyViewed({ productId }: { productId: string }) {
  const addItem = useRecentlyViewedStore(state => state.addItem)

  useEffect(() => {
    addItem(productId)
  }, [productId, addItem])

  return null
}
