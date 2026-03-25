import { Compass } from 'lucide-react'
import { Card } from '@/components/ui'

export default function StoreNotFound() {
  return (
    <div className="app-shell-gradient flex min-h-screen items-center justify-center px-4">
      <Card variant="hero" className="w-full max-w-lg text-center">
        <div className="mx-auto mb-4 inline-flex rounded-full bg-[var(--ds-primary-soft)] p-4 text-[var(--ds-primary)] shadow-[var(--ds-shadow-sm)]">
          <Compass className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ds-text-soft)]">404</p>
        <h1 className="ds-heading mt-3 text-3xl font-black text-[var(--ds-text)]">المتجر غير موجود</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
          لم يتم العثور على هذا المتجر. قد يكون الرابط غير صحيح أو أن المتجر لم يعد متاحًا.
        </p>
      </Card>
    </div>
  )
}
