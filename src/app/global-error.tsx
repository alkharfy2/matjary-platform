'use client'

import { AlertTriangle } from 'lucide-react'
import { Button, Card } from '@/components/ui'

// واجهة الخطأ العامة في Next.js؛ تظهر عند فشل غير متوقع على مستوى التطبيق.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="app-shell-gradient">
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card variant="hero" className="w-full max-w-lg text-center">
            <div className="mx-auto mb-4 inline-flex rounded-full bg-rose-100 p-4 text-rose-600 shadow-[0_16px_32px_rgba(205,49,77,0.18)]">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">حدث خطأ</p>
            <h2 className="ds-heading mt-3 text-3xl font-black text-[var(--ds-text)]">تعذّر إكمال العملية</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
              نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة الآن، وإذا تكرر فغالبًا هناك مشكلة مؤقتة سيتم حلها سريعًا.
            </p>
            <div className="mt-6">
              {/* reset يعيد محاولة آخر render لنفس المسار. */}
              <Button onClick={reset} glow>حاول مرة أخرى</Button>
            </div>
          </Card>
        </div>
      </body>
    </html>
  )
}
