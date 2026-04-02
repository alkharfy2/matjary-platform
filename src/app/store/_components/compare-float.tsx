'use client'

/**
 * شريط المقارنة العائم (standalone version)
 * ملاحظة: في layout.tsx يتم تحميله من داخل WhatsAppFloatingButton
 * لتفادي حد RSC chunks. هذا الملف يُستخدم كمرجع أو للاستيراد من صفحات client.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GitCompareArrows, X } from 'lucide-react'
import { useCompareStore } from '@/lib/stores/compare-store'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'

export function CompareFloat() {
  const items = useCompareStore(state => state.items)
  const clear = useCompareStore(state => state.clear)
  const store = useStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted || items.length === 0) return null

  return (
    <div className="fixed bottom-20 start-4 z-50 flex items-center gap-3 rounded-2xl border border-[var(--ds-divider)] bg-[var(--surface-card,#fff)] px-4 py-3 shadow-[var(--ds-shadow-lg)]">
      <GitCompareArrows className="h-5 w-5 text-[var(--color-primary,#000)]" />
      <span className="text-sm font-semibold text-[var(--ds-text)]">
        {items.length} منتج للمقارنة
      </span>
      <Link
        href={storePath('/compare' as `/${string}`, { storeSlug: store.slug })}
        className="rounded-full px-4 py-1.5 text-xs font-bold text-white"
        style={{ backgroundColor: 'var(--color-primary, #111827)' }}
      >
        قارن الآن
      </Link>
      <button
        onClick={clear}
        className="rounded-full p-1 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
        aria-label="مسح المقارنة"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
