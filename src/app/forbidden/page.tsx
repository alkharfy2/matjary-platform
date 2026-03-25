import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { ForbiddenBackButton } from './forbidden-back-button'
import { Button, Card } from '@/components/ui'
import { FloatingAccent, Reveal } from '@/components/motion'

type ForbiddenPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined): string | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function getMessage(scope: string | null): string {
  if (scope === 'dashboard-store') {
    return 'ليس لديك صلاحية للوصول إلى هذا المتجر أو لوحة التحكم المرتبطة به.'
  }

  return 'ليس لديك صلاحية للوصول إلى هذه الصفحة في الوقت الحالي.'
}

export default async function ForbiddenPage({ searchParams }: ForbiddenPageProps) {
  const rawSearchParams = searchParams ? await searchParams : {}
  const scope = getFirstParam(rawSearchParams.scope)

  return (
    <div className="app-shell-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <FloatingAccent tone="primary" size="md" className="-right-10 top-10" />
      <FloatingAccent tone="accent" size="md" className="-left-10 bottom-12" />
      <Reveal variant="scale" className="w-full max-w-lg">
        <Card variant="hero" className="w-full text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-rose-100 p-4 text-rose-600 shadow-[0_16px_32px_rgba(205,49,77,0.18)]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">403</p>
          <h1 className="ds-heading mt-3 text-3xl font-black text-[var(--ds-text)]">ممنوع الوصول</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">{getMessage(scope)}</p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button glow>العودة إلى لوحة التحكم</Button>
            </Link>
            <ForbiddenBackButton />
          </div>
        </Card>
      </Reveal>
    </div>
  )
}
