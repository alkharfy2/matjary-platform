'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui'

type BulkAction = {
  label: string
  value: string
  variant?: 'primary' | 'danger'
}

type BulkActionBarProps = {
  selectedCount: number
  actions: BulkAction[]
  onAction: (action: string) => void
  onClear: () => void
}

export function BulkActionBar({ selectedCount, actions, onAction, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm">
      <span className="text-sm font-semibold text-blue-700">{selectedCount} عنصر محدد</span>

      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.value}
            variant={action.variant === 'danger' ? 'danger' : 'secondary'}
            size="sm"
            onClick={() => onAction(action.value)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <button onClick={onClear} className="mr-auto text-blue-500 hover:text-blue-700" title="إلغاء التحديد">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
