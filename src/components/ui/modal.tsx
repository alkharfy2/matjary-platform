'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from './button'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Modal({ open, title, onClose, children, className }: ModalProps) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--ds-overlay)] p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn('w-full max-w-xl rounded-[var(--ds-radius-lg)] border border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] p-5 shadow-[var(--ds-shadow-md)]', className)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--ds-text)]">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق">
            إغلاق
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
