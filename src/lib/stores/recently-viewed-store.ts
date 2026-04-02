import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type RecentlyViewedItem = {
  productId: string
  viewedAt: number
}

type RecentlyViewedStore = {
  items: RecentlyViewedItem[]

  addItem: (productId: string) => void
  getItems: () => RecentlyViewedItem[]
  clearAll: () => void
}

const MAX_ITEMS = 10

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId) => {
        set((state) => {
          // إزالة نسخة قديمة لو موجودة (لتحديث الوقت)
          const filtered = state.items.filter(i => i.productId !== productId)
          // إضافة في الأول
          const updated = [{ productId, viewedAt: Date.now() }, ...filtered]
          // الحد الأقصى 10
          return { items: updated.slice(0, MAX_ITEMS) }
        })
      },

      getItems: () => get().items,

      clearAll: () => set({ items: [] }),
    }),
    {
      name: 'matjary-recently-viewed',
    }
  )
)
