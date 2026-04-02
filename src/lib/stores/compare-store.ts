import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CompareItem = {
  productId: string
  addedAt: number
}

type CompareStore = {
  items: CompareItem[]
  maxItems: number

  setMaxItems: (max: number) => void
  addItem: (productId: string) => boolean
  removeItem: (productId: string) => void
  isInCompare: (productId: string) => boolean
  clear: () => void
  getItems: () => CompareItem[]
  getCount: () => number
  isFull: () => boolean
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      maxItems: 4,

      setMaxItems: (max) => set({ maxItems: max }),

      addItem: (productId) => {
        const { items, maxItems } = get()
        if (items.some(i => i.productId === productId)) return false
        if (items.length >= maxItems) return false

        set((state) => ({
          items: [...state.items, { productId, addedAt: Date.now() }],
        }))
        return true
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(i => i.productId !== productId),
        }))
      },

      isInCompare: (productId) => {
        return get().items.some(i => i.productId === productId)
      },

      clear: () => set({ items: [] }),

      getItems: () => get().items,

      getCount: () => get().items.length,

      isFull: () => {
        const { items, maxItems } = get()
        return items.length >= maxItems
      },
    }),
    {
      name: 'matjary-compare',
    }
  )
)
