'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { StoreTheme, StoreSettings } from '@/db/schema'

export type StoreContextValue = {
  id: string
  slug: string
  name: string
  theme: StoreTheme
  settings: StoreSettings
  whatsappNumber: string | null
}
// store context
const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({
  store,
  children,
}: {
  store: StoreContextValue
  children: ReactNode
}) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
