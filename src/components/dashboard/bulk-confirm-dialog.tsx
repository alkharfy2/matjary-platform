'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'

type BulkConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function BulkConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  variant = 'default',
  onConfirm,
  onCancel,
}: BulkConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {variant === 'danger' && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        )}

        <h3 className="text-center text-lg font-bold text-[var(--ds-text)]">{title}</h3>
        <p className="mt-2 text-center text-sm text-[var(--ds-text-muted)]">{description}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            إلغاء
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'جارٍ التنفيذ...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
