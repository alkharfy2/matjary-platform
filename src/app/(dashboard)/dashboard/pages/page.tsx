import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { storePages } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { formatDate } from '@/lib/utils'

function getStatusLabel(isPublished: boolean) {
  return isPublished ? '\u0645\u0646\u0634\u0648\u0631\u0629' : '\u0645\u0633\u0648\u062f\u0629'
}

function getPageTypeLabel(pageType: string) {
  if (pageType === 'about') return '\u0645\u0646 \u0646\u062d\u0646'
  if (pageType === 'contact') return '\u0627\u062a\u0635\u0644 \u0628\u0646\u0627'
  if (pageType === 'faq') return '\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629'
  if (pageType === 'terms') return '\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062d\u0643\u0627\u0645'
  if (pageType === 'privacy') return '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629'
  if (pageType === 'landing') return '\u0635\u0641\u062d\u0629 \u0647\u0628\u0648\u0637'
  return '\u0645\u062e\u0635\u0635\u0629'
}

export default async function PagesPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const pages = await db
    .select()
    .from(storePages)
    .where(eq(storePages.storeId, store.id))
    .orderBy(desc(storePages.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{'\u0627\u0644\u0635\u0641\u062d\u0627\u062a'}</h1>
        <Link
          href="/dashboard/pages/new"
          className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)]"
        >
          {'+ \u0625\u0636\u0627\u0641\u0629 \u0635\u0641\u062d\u0629'}
        </Link>
      </div>

      <div className="overflow-hidden card-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
          <thead className="bg-[var(--ds-surface-muted)]">
            <tr>
              <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0639\u0646\u0648\u0627\u0646'}</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0631\u0627\u0628\u0637'}</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u062d\u0627\u0644\u0629'}</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0646\u0648\u0639'}</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">{'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0646\u0634\u0627\u0621'}</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a'}</th>
            </tr>
          </thead>
          <tbody>
            {pages.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[var(--ds-text-muted)]">
                  {'\u0644\u0627 \u062a\u0648\u062c\u062f \u0635\u0641\u062d\u0627\u062a \u0628\u0639\u062f. \u0623\u0646\u0634\u0626 \u0635\u0641\u062d\u0629 \u062c\u062f\u064a\u062f\u0629 \u0628\u0627\u0644\u0632\u0631 \u0623\u0639\u0644\u0627\u0647.'}
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.id} className="border-t border-[var(--ds-border)]/70">
                  <td className="px-6 py-4">
                    <p className="font-medium">{page.title}</p>
                    {page.seoTitle ? <p className="text-xs text-[var(--ds-text-muted)]">{page.seoTitle}</p> : null}
                  </td>
                  <td className="px-6 py-4" dir="ltr">/{page.slug}</td>
                  <td className="px-6 py-4">
                    <span className={page.isPublished ? 'rounded-full bg-green-100 px-2 py-1 text-xs text-green-700' : 'rounded-full bg-[var(--ds-surface-muted)] px-2 py-1 text-xs text-[var(--ds-text)]'}>
                      {getStatusLabel(page.isPublished)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">{getPageTypeLabel(page.pageType)}</td>
                  <td className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">{formatDate(page.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/pages/${page.id}/edit`} className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">
                        {'\u062a\u0639\u062f\u064a\u0644'}
                      </Link>
                      <Link href={storePath(`/page/${page.slug}`, { storeSlug: store.slug })} target="_blank" className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">
                        {'\u0645\u0639\u0627\u064a\u0646\u0629'}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}




