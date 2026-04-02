'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BulkActionBar } from '@/components/dashboard/bulk-action-bar'
import { BulkConfirmDialog } from '@/components/dashboard/bulk-confirm-dialog'

type OrdersBulkWrapperProps = {
  orderIds: string[]
  children: (props: {
    selectedIds: Set<string>
    toggleSelect: (id: string) => void
    toggleAll: () => void
    allSelected: boolean
  }) => React.ReactNode
}

const ORDER_STATUSES = [
  { label: 'تأكيد', value: 'confirmed' },
  { label: 'قيد التحضير', value: 'processing' },
  { label: 'تم الشحن', value: 'shipped' },
  { label: 'تم التسليم', value: 'delivered' },
  { label: 'إلغاء', value: 'cancelled', variant: 'danger' as const },
]

export function OrdersBulkWrapper({ orderIds, children }: OrdersBulkWrapperProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    status: string
    statusLabel: string
    variant: 'danger' | 'default'
  }>({ open: false, status: '', statusLabel: '', variant: 'default' })

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === orderIds.length) return new Set()
      return new Set(orderIds)
    })
  }, [orderIds])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const allSelected = selectedIds.size === orderIds.length && orderIds.length > 0

  const bulkActions = ORDER_STATUSES.map(s => ({
    label: s.label,
    value: s.value,
    variant: s.variant,
  }))

  const handleAction = (status: string) => {
    const match = ORDER_STATUSES.find(s => s.value === status)
    if (!match) return
    setConfirmDialog({
      open: true,
      status,
      statusLabel: match.label,
      variant: status === 'cancelled' ? 'danger' : 'default',
    })
  }

  const executeAction = async () => {
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch('/api/dashboard/orders/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', ids, status: confirmDialog.status }),
      })

      if (res.ok) {
        clearSelection()
        router.refresh()
      }
    } catch {
      // silent
    }
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  return (
    <>
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={bulkActions}
        onAction={handleAction}
        onClear={clearSelection}
      />

      {children({ selectedIds, toggleSelect, toggleAll, allSelected })}

      <BulkConfirmDialog
        open={confirmDialog.open}
        title={`تغيير حالة ${selectedIds.size} طلب إلى "${confirmDialog.statusLabel}"`}
        description={`سيتم تحديث حالة ${selectedIds.size} طلب. هل أنت متأكد؟`}
        confirmLabel="تأكيد"
        variant={confirmDialog.variant}
        onConfirm={executeAction}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </>
  )
}
