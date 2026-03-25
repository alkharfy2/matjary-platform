'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  productId: string
  productName: string
  productImage: string | null
  variantId: string | null
  variantLabel: string | null
  quantity: number
  maxQuantity?: number | null
  unitPrice: number
}

type CartStore = {
  items: CartItem[]
  storeId: string | null

  setStoreId: (id: string) => void
  addItem: (item: CartItem) => void
  removeItem: (productId: string, variantId: string | null) => void
  updateQuantity: (
    productId: string,
    variantId: string | null,
    quantity: number
  ) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,

      setStoreId: (id) => {
        const current = get().storeId
        if (current && current !== id) {
          // Different store → clear cart
          set({ items: [], storeId: id })
        } else {
          set({ storeId: id })
        }
      },

      addItem: (item) =>
        set((state) => {
          const incomingQuantity = Math.max(1, Math.floor(item.quantity))
          const incomingMax =
            typeof item.maxQuantity === 'number' && Number.isFinite(item.maxQuantity)
              ? Math.max(1, Math.floor(item.maxQuantity))
              : null

          const existing = state.items.find(
            (i) =>
              i.productId === item.productId && i.variantId === item.variantId
          )

          if (existing) {
            const existingMax =
              typeof existing.maxQuantity === 'number' && Number.isFinite(existing.maxQuantity)
                ? Math.max(1, Math.floor(existing.maxQuantity))
                : null
            const mergedMax =
              existingMax !== null && incomingMax !== null
                ? Math.min(existingMax, incomingMax)
                : existingMax ?? incomingMax

            return {
              items: state.items.map((i) =>
                i.productId === item.productId &&
                i.variantId === item.variantId
                  ? {
                      ...i,
                      maxQuantity: mergedMax,
                      quantity:
                        mergedMax !== null
                          ? Math.min(i.quantity + incomingQuantity, mergedMax)
                          : i.quantity + incomingQuantity,
                    }
                  : i
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                ...item,
                maxQuantity: incomingMax,
                quantity:
                  incomingMax !== null
                    ? Math.min(incomingQuantity, incomingMax)
                    : incomingQuantity,
              },
            ],
          }
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(i.productId === productId && i.variantId === variantId)
          ),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => {
              if (!(i.productId === productId && i.variantId === variantId)) {
                return i
              }

              const maxQuantity =
                typeof i.maxQuantity === 'number' && Number.isFinite(i.maxQuantity)
                  ? Math.max(1, Math.floor(i.maxQuantity))
                  : null

              if (quantity <= 0) {
                return null
              }

              const normalizedQuantity = Math.max(1, Math.floor(quantity))
              return {
                ...i,
                quantity:
                  maxQuantity !== null
                    ? Math.min(normalizedQuantity, maxQuantity)
                    : normalizedQuantity,
              }
            })
            .filter((item): item is CartItem => item !== null),
        })),

      clearCart: () => set({ items: [], storeId: null }),

      getSubtotal: () =>
        get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        ),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'matjary-cart',
      partialize: (state) => ({ items: state.items, storeId: state.storeId }),
    }
  )
)
