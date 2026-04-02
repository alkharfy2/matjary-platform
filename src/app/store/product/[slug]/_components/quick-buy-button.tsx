'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'

type QuickBuyButtonProps = {
  productId: string
  productName: string
  productImage: string | null
  variantId: string | null
  variantLabel: string | null
  unitPrice: number
  stock: number
  disabled?: boolean
}

export function QuickBuyButton({
  productId,
  productName,
  productImage,
  variantId,
  variantLabel,
  unitPrice,
  stock,
  disabled = false,
}: QuickBuyButtonProps) {
  const router = useRouter()
  const store = useStore()
  const { clearCart, addItem, setStoreId } = useCartStore()
  const [loading, setLoading] = useState(false)

  const handleQuickBuy = useCallback(() => {
    if (disabled || loading || stock <= 0) return

    setLoading(true)

    // Clear cart, add only this product, go to checkout
    setStoreId(store.id)
    clearCart()
    addItem({
      productId,
      productName,
      productImage,
      variantId,
      variantLabel,
      quantity: 1,
      maxQuantity: stock,
      unitPrice,
    })

    router.push(storePath('/checkout', { storeSlug: store.slug }))
  }, [
    addItem,
    clearCart,
    disabled,
    loading,
    productId,
    productImage,
    productName,
    router,
    setStoreId,
    stock,
    store.id,
    store.slug,
    unitPrice,
    variantId,
    variantLabel,
  ])

  return (
    <button
      onClick={handleQuickBuy}
      disabled={disabled || loading || stock <= 0}
      className="flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-[var(--color-primary,#000)] py-4 text-base font-semibold transition-all hover:-translate-y-0.5 hover:bg-[var(--color-primary,#000)]/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      style={{ color: 'var(--color-primary, #000)' }}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Zap className="h-5 w-5" />
      )}
      {loading ? 'جاري التوجيه...' : 'اشتري الآن'}
    </button>
  )
}
