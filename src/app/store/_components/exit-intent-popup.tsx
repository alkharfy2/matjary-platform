'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/lib/tenant/store-context'
import { usePathname } from 'next/navigation'

export function ExitIntentPopup() {
  const store = useStore()
  const pathname = usePathname()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  const settings = store.settings as Record<string, unknown>
  const enabled = settings.exitIntentEnabled === true
  const message = (settings.exitIntentMessage as string) || 'لا تفوّت هذا العرض! 🎁'
  const couponCode = (settings.exitIntentCouponCode as string) || ''
  const pages = (settings.exitIntentPages as string) || 'all'

  const shouldShowOnPage = useCallback(() => {
    if (!enabled) return false
    if (pages === 'all') return true
    if (pages === 'product' && pathname.includes('/product/')) return true
    if (pages === 'checkout' && pathname.includes('/checkout')) return true
    if (pages === 'home' && (pathname.endsWith('/') || pathname.endsWith(store.slug))) return true
    return false
  }, [enabled, pages, pathname, store.slug])

  useEffect(() => {
    if (!shouldShowOnPage() || dismissed) return

    // Check sessionStorage so popup shows once per session
    const key = `exit_intent_${store.id}`
    if (sessionStorage.getItem(key)) return

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        setShow(true)
        sessionStorage.setItem(key, '1')
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [shouldShowOnPage, dismissed, store.id])

  if (!show || dismissed) return null

  function handleCopy() {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute left-3 top-3 rounded-full p-1 text-gray-400 hover:text-gray-600"
          aria-label="إغلاق"
        >
          ✕
        </button>

        <div className="mb-4 text-4xl">🎁</div>
        <p className="text-lg font-bold text-gray-800">{message}</p>

        {couponCode && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-gray-500">استخدم كود الخصم:</p>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-6 py-3 font-mono text-lg font-bold text-amber-800 transition-colors hover:bg-amber-100"
              dir="ltr"
            >
              {couponCode}
              <span className="text-sm font-normal">{copied ? '✅ تم النسخ' : '📋 نسخ'}</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="mt-5 w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
        >
          متابعة التسوق
        </button>
      </div>
    </div>
  )
}
