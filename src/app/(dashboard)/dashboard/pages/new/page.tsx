import Link from 'next/link'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { storePages } from '@/db/schema'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'

function normalizeSlug(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

type NewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewPagePage({ searchParams }: NewPageProps) {
  const raw = await searchParams
  const error = getFirstParam(raw.error)

  async function createPageAction(formData: FormData) {
    'use server'

    const access = await getDashboardStoreAccessContext({ path: '/dashboard/pages/new' })
    if (access.status === 'unauthenticated') {
      redirect('/auth/sign-in?redirect_url=%2Fdashboard%2Fpages%2Fnew')
    }
    if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
      redirect('/forbidden?scope=dashboard-store')
    }
    const { store } = access

    const title = String(formData.get('title') ?? '').trim()
    const slugInput = String(formData.get('slug') ?? '').trim()
    const pageType = String(formData.get('pageType') ?? 'custom').trim()
    const seoTitle = String(formData.get('seoTitle') ?? '').trim()
    const seoDescription = String(formData.get('seoDescription') ?? '').trim()
    const isPublished = formData.get('isPublished') === 'on'

    if (!title) redirect('/dashboard/pages/new?error=missing-title')

    const slug = normalizeSlug(slugInput)
    if (!slug) redirect('/dashboard/pages/new?error=missing-slug')

    const allowedTypes = new Set(['landing', 'about', 'contact', 'faq', 'terms', 'privacy', 'custom'])
    const safePageType = allowedTypes.has(pageType) ? pageType : 'custom'

    const existing = await db
      .select({ id: storePages.id })
      .from(storePages)
      .where(and(eq(storePages.storeId, store.id), eq(storePages.slug, slug)))
      .limit(1)

    if (existing[0]) redirect('/dashboard/pages/new?error=slug-exists')

    const created = await db
      .insert(storePages)
      .values({
        storeId: store.id,
        title,
        slug,
        content: [],
        pageType: safePageType,
        isPublished,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      })
      .returning({ id: storePages.id })

    const createdId = created[0]?.id
    if (!createdId) redirect('/dashboard/pages')

    redirect(`/dashboard/pages/${createdId}/edit?saved=1`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{'\u0625\u0636\u0627\u0641\u0629 \u0635\u0641\u062d\u0629 \u062c\u062f\u064a\u062f\u0629'}</h1>
        <Link href="/dashboard/pages" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">
          {'\u0631\u062c\u0648\u0639'}
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'missing-title' && '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u0637\u0644\u0648\u0628.'}
          {error === 'missing-slug' && '\u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0637\u0644\u0648\u0628.'}
          {error === 'slug-exists' && '\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644.'}
          {error !== 'missing-title' && error !== 'missing-slug' && error !== 'slug-exists' && '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0635\u0641\u062d\u0629.'}
        </div>
      ) : null}

      <form action={createPageAction} className="space-y-4 card-surface p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">{'\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0635\u0641\u062d\u0629'}</label>
            <input name="title" required className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">{'\u0627\u0644\u0631\u0627\u0628\u0637 (slug)'}</label>
            <input name="slug" required placeholder="about-us" className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" dir="ltr" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">{'\u0646\u0648\u0639 \u0627\u0644\u0635\u0641\u062d\u0629'}</label>
            <select name="pageType" defaultValue="custom" className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2">
              <option value="custom">{'\u0645\u062e\u0635\u0635\u0629'}</option>
              <option value="about">{'\u0645\u0646 \u0646\u062d\u0646'}</option>
              <option value="contact">{'\u0627\u062a\u0635\u0644 \u0628\u0646\u0627'}</option>
              <option value="faq">{'\u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u0634\u0627\u0626\u0639\u0629'}</option>
              <option value="terms">{'\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062d\u0643\u0627\u0645'}</option>
              <option value="privacy">{'\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629'}</option>
              <option value="landing">{'\u0635\u0641\u062d\u0629 \u0647\u0628\u0648\u0637'}</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--ds-border)] px-3 py-2">
              <input type="checkbox" name="isPublished" />
              <span>{'\u0646\u0634\u0631 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u0628\u0627\u0634\u0631\u0629'}</span>
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Title</label>
          <input name="seoTitle" maxLength={70} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Description</label>
          <textarea name="seoDescription" maxLength={160} rows={3} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="text-sm font-semibold">{'\u0645\u0644\u0627\u062d\u0638\u0629 \u0645\u0647\u0645\u0629:'}</p>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-sm leading-6">
            <li>{'\u0628\u0639\u062f \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0633\u064a\u062a\u0645 \u0646\u0642\u0644\u0643 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627 \u0625\u0644\u0649 \u0634\u0627\u0634\u0629 \u062a\u0639\u062f\u064a\u0644 \u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0635\u0641\u062d\u0629.'}</li>
            <li>{'\u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u0644\u0631\u0627\u0628\u0637 (slug) \u0642\u0628\u0644 \u0627\u0644\u0625\u0646\u0634\u0627\u0621 \u0644\u062a\u062c\u0646\u0651\u0628 \u062a\u0639\u0627\u0631\u0636 \u0627\u0644\u0631\u0648\u0627\u0628\u0637.'}</li>
          </ul>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/dashboard/pages" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">{'\u0625\u0644\u063a\u0627\u0621'}</Link>
          <button type="submit" className="w-full rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] sm:w-auto">{'\u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0635\u0641\u062d\u0629'}</button>
        </div>
      </form>
    </div>
  )
}





