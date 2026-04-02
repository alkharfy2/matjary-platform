'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BulkActionBar } from '@/components/dashboard/bulk-action-bar'
import { BulkConfirmDialog } from '@/components/dashboard/bulk-confirm-dialog'

type Product = {
  id: string
  name: string
  isActive: boolean
}

type ProductsBulkWrapperProps = {
  products: Product[]
  children: (props: {
    selectedIds: Set<string>
    toggleSelect: (id: string) => void
    toggleAll: () => void
    allSelected: boolean
  }) => React.ReactNode
}

const PRODUCT_ACTIONS = [
  { label: 'تفعيل', value: 'activate' },
  { label: 'تعطيل', value: 'deactivate' },
  { label: 'حذف', value: 'delete', variant: 'danger' as const },
]

export function ProductsBulkWrapper({ products, children }: ProductsBulkWrapperProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: string
    title: string
    description: string
    variant: 'danger' | 'default'
  }>({ open: false, action: '', title: '', description: '', variant: 'default' })

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
      if (prev.size === products.length) return new Set()
      return new Set(products.map(p => p.id))
    })
  }, [products])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])
  const allSelected = selectedIds.size === products.length && products.length > 0

  const handleAction = (action: string) => {
    const count = selectedIds.size
    switch (action) {
      case 'activate':
        setConfirmDialog({
          open: true, action, variant: 'default',
          title: `تفعيل ${count} منتج`,
          description: `سيتم تفعيل ${count} منتج وإظهارهم في المتجر.`,
        })
        break
      case 'deactivate':
        setConfirmDialog({
          open: true, action, variant: 'default',
          title: `تعطيل ${count} منتج`,
          description: `سيتم تعطيل ${count} منتج وإخفاؤهم من المتجر.`,
        })
        break
      case 'delete':
        setConfirmDialog({
          open: true, action, variant: 'danger',
          title: `حذف ${count} منتج`,
          description: `سيتم حذف ${count} منتج نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
        })
        break
    }
  }

  const executeAction = async () => {
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch('/api/dashboard/products/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmDialog.action, ids }),
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
        actions={PRODUCT_ACTIONS}
        onAction={handleAction}
        onClear={clearSelection}
      />

      {children({ selectedIds, toggleSelect, toggleAll, allSelected })}

      <BulkConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.action === 'delete' ? 'حذف نهائي' : 'تأكيد'}
        variant={confirmDialog.variant}
        onConfirm={executeAction}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
      />
    </>
  )
}
