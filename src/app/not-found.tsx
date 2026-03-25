import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { FloatingAccent, Reveal } from '@/components/motion'

export default function NotFound() {
  return (
    <div className="app-shell-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <FloatingAccent tone="primary" size="lg" className="-right-12 top-8" />
      <FloatingAccent tone="accent" size="md" className="-left-8 bottom-10" />
      <Reveal variant="scale" className="w-full max-w-lg">
        <Card variant="hero" className="w-full text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-[var(--ds-primary-soft)] p-4 text-[var(--ds-primary)] shadow-[var(--ds-glow-primary)]">
            <Compass className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ds-text-soft)]">404</p>
          <h1 className="ds-heading mt-3 text-3xl font-black text-[var(--ds-text)]">الصفحة غير موجودة</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
            يبدو أنك وصلت إلى رابط غير متاح أو صفحة تم نقلها. يمكنك العودة للمسار الرئيسي ومتابعة التصفح.
          </p>
          <div className="mt-6">
            <Link href="/">
              <Button glow>العودة للرئيسية</Button>
            </Link>
          </div>
        </Card>
      </Reveal>
    </div>
  )
}
