import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WishlistItem = {
  productId: string
  variantId?: string
  addedAt: number
}

type WishlistStore = {
  items: WishlistItem[]
  addItem: (productId: string, variantId?: string) => void
  removeItem: (productId: string, variantId?: string) => void
  isInWishlist: (productId: string, variantId?: string) => boolean
  clearAll: () => void
  getItems: () => WishlistItem[]
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, variantId) => {
        const exists = get().items.some(
          i => i.productId === productId && i.variantId === variantId
        )
        if (exists) return

        set((state) => ({
          items: [...state.items, { productId, variantId, addedAt: Date.now() }],
        }))
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            i => !(i.productId === productId && i.variantId === variantId)
          ),
        }))
      },

      isInWishlist: (productId, variantId) => {
        return get().items.some(
          i => i.productId === productId && i.variantId === variantId
        )
      },

      clearAll: () => set({ items: [] }),
      getItems: () => get().items,
    }),
    {
      name: 'matjary-wishlist',
    }
  )
)
