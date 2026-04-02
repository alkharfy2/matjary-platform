'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after 30 seconds of browsing
      const timer = setTimeout(() => setShowBanner(true), 30000)
      return () => clearTimeout(timer)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] p-4 shadow-[var(--ds-shadow-lg)]">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div>
          <p className="font-semibold text-sm text-[var(--ds-text)]">📲 أضف المتجر للشاشة الرئيسية</p>
          <p className="text-xs text-[var(--ds-text-muted)]">تصفح أسرع بدون متصفح</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBanner(false)}
            className="px-3 py-1.5 text-xs text-[var(--ds-text-muted)]"
          >
            لاحقاً
          </button>
          <button
            onClick={handleInstall}
            className="px-4 py-1.5 text-xs rounded-lg font-medium bg-[var(--color-primary,#111)] text-[var(--color-primary-contrast,#fff)]"
          >
            تثبيت
          </button>
        </div>
      </div>
    </div>
  )
}
