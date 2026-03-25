'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type CartToastProps = {
  open: boolean
  message: string
  actionLabel?: string
  onAction?: () => void
  onClose: () => void
}

export function CartToast({
  open,
  message,
  actionLabel,
  onAction,
  onClose,
}: CartToastProps) {
  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 z-[60] flex justify-center px-4 transition-all duration-300',
        'bottom-20 md:bottom-6',
        open
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      )}
    >
      <div className="surface-panel-elevated flex w-full max-w-lg items-center gap-3 rounded-[24px] px-4 py-3">
        <span
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-[var(--ds-shadow-sm)]"
          style={{
            backgroundColor: 'color-mix(in oklab, var(--ds-success) 16%, var(--ds-surface-elevated))',
            color: 'var(--ds-success)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </span>

        <span className="flex-1 text-sm font-semibold text-[var(--ds-text)]">{message}</span>

        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="flex-shrink-0 rounded-full bg-[var(--accent-soft,#eff6ff)] px-3 py-1.5 text-sm font-semibold transition-all hover:-translate-y-0.5"
            style={{ color: 'var(--color-primary, #000)' }}
          >
            {actionLabel}
          </button>
        ) : null}

        <button
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--ds-icon-muted)] transition-all hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text-muted)]"
          aria-label="إغلاق"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
