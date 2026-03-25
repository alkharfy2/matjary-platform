'use client'

import { AlertTriangle } from 'lucide-react'
import { Button, Card } from '@/components/ui'

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="app-shell-gradient flex min-h-screen items-center justify-center px-4">
      <Card variant="hero" className="w-full max-w-lg text-center">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-[color:color-mix(in_oklab,var(--ds-danger)_18%,var(--ds-surface-elevated))] p-4 text-[var(--ds-danger)] shadow-[var(--ds-shadow-sm)]">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)]">حدث خطأ</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
          {error.message || 'حدث خطأ أثناء تحميل المتجر. يرجى المحاولة مرة أخرى.'}
        </p>
        <div className="mt-6">
          <Button onClick={reset} glow>حاول مرة أخرى</Button>
        </div>
      </Card>
    </div>
  )
}
