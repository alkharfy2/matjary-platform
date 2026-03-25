import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import type { PageBlock } from '@/db/schema'
import { db } from '@/db'
import { storePages } from '@/db/schema'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { storePath } from '@/lib/tenant/store-path'
import { updatePageSchema } from '@/lib/validations/order'
import { PageBlocksEditor } from './_components/page-blocks-editor'

type EditPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function getErrorMessage(error?: string) {
  if (!error) return null
  if (error === 'missing-title') return '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0635\u0641\u062d\u0629 \u0645\u0637\u0644\u0648\u0628.'
  if (error === 'missing-slug') return '\u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0637\u0644\u0648\u0628.'
  if (error === 'slug-exists') return '\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0635\u0641\u062d\u0629 \u0623\u062e\u0631\u0649.'
  if (error === 'invalid-content-json') return '\u0645\u062d\u062a\u0648\u0649 JSON \u063a\u064a\u0631 \u0635\u0627\u0644\u062d. \u062a\u0623\u0643\u062f \u0645\u0646 \u0635\u064a\u063a\u0629 \u0627\u0644\u0645\u0635\u0641\u0648\u0641\u0629.'
  if (error === 'invalid-content-schema') return '\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0635\u0641\u062d\u0629 \u0644\u0627 \u064a\u0637\u0627\u0628\u0642 \u062a\u0646\u0633\u064a\u0642 \u0627\u0644\u0628\u0644\u0648\u0643\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628.'
  if (error === 'save-failed') return '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062d\u0641\u0638.'
  return '\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639.'
}

export default async function EditPagePage({ params, searchParams }: EditPageProps) {
  const { id } = await params
  const access = await getDashboardStoreAccessContext({ path: `/dashboard/pages/${id}/edit` })
  if (access.status === 'unauthenticated') {
    redirect('/auth/sign-in?redirect_url=%2Fdashboard%2Fpages')
  }
  if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
    redirect('/forbidden?scope=dashboard-store')
  }
  const { store } = access

  const rawSearch = await searchParams
  const error = getFirstParam(rawSearch.error)
  const saved = getFirstParam(rawSearch.saved)

  const pageRows = await db
    .select()
    .from(storePages)
    .where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))
    .limit(1)

  const page = pageRows[0]
  if (!page) notFound()

  async function updatePageAction(formData: FormData) {
    'use server'

    try {
      const access = await getDashboardStoreAccessContext({ path: `/dashboard/pages/${id}/edit` })
      if (access.status === 'unauthenticated') {
        redirect('/auth/sign-in?redirect_url=%2Fdashboard%2Fpages')
      }
      if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
        redirect('/forbidden?scope=dashboard-store')
      }
      const { store } = access

      const title = String(formData.get('title') ?? '').trim()
      const slugRaw = String(formData.get('slug') ?? '').trim()
      const pageType = String(formData.get('pageType') ?? 'custom').trim()
      const seoTitle = String(formData.get('seoTitle') ?? '').trim()
      const seoDescription = String(formData.get('seoDescription') ?? '').trim()
      const isPublished = formData.get('isPublished') === 'on'
      const contentRaw = String(formData.get('contentJson') ?? '[]').trim()

      if (!title) redirect(`/dashboard/pages/${id}/edit?error=missing-title`)

      const slug = normalizeSlug(slugRaw)
      if (!slug) redirect(`/dashboard/pages/${id}/edit?error=missing-slug`)

      const duplicate = await db
        .select({ id: storePages.id })
        .from(storePages)
        .where(and(eq(storePages.storeId, store.id), eq(storePages.slug, slug)))
        .limit(1)

      if (duplicate[0] && duplicate[0].id !== id) {
        redirect(`/dashboard/pages/${id}/edit?error=slug-exists`)
      }

      let contentParsed: unknown
      try {
        contentParsed = contentRaw ? JSON.parse(contentRaw) : []
      } catch {
        redirect(`/dashboard/pages/${id}/edit?error=invalid-content-json`)
      }

      const parsed = updatePageSchema.safeParse({
        title,
        slug,
        pageType,
        isPublished,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        content: contentParsed,
      })

      if (!parsed.success) {
        redirect(`/dashboard/pages/${id}/edit?error=invalid-content-schema`)
      }

      await db
        .update(storePages)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(storePages.id, id), eq(storePages.storeId, store.id)))

      redirect(`/dashboard/pages/${id}/edit?saved=1`)
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'digest' in error &&
        typeof (error as { digest?: unknown }).digest === 'string' &&
        String((error as { digest: string }).digest).startsWith('NEXT_REDIRECT')
      ) {
        throw error
      }

      redirect(`/dashboard/pages/${id}/edit?error=save-failed`)
    }
  }

  const initialBlocks = (Array.isArray(page.content) ? page.content : []) as PageBlock[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{'\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629'}</h1>
          <p className="text-sm text-[var(--ds-text-muted)]" dir="ltr">/{page.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/pages" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">{'\u0631\u062c\u0648\u0639'}</Link>
          <Link href={storePath(`/page/${page.slug}`, { storeSlug: store.slug })} target="_blank" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">{'\u0645\u0639\u0627\u064a\u0646\u0629 \u0641\u064a \u0627\u0644\u0645\u062a\u062c\u0631'}</Link>
        </div>
      </div>

      {saved === '1' ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{'\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0635\u0641\u062d\u0629 \u0628\u0646\u062c\u0627\u062d.'}</div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getErrorMessage(error)}</div>
      ) : null}

      <form action={updatePageAction} className="space-y-6 card-surface p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">{'\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0635\u0641\u062d\u0629'}</label>
            <input name="title" defaultValue={page.title} required className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">{'\u0627\u0644\u0631\u0627\u0628\u0637 (slug)'}</label>
            <input name="slug" defaultValue={page.slug} required dir="ltr" className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">{'\u0646\u0648\u0639 \u0627\u0644\u0635\u0641\u062d\u0629'}</label>
            <select name="pageType" defaultValue={page.pageType} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2">
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
              <input type="checkbox" name="isPublished" defaultChecked={page.isPublished} />
              <span>{'\u0645\u0646\u0634\u0648\u0631\u0629'}</span>
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Title</label>
            <input name="seoTitle" defaultValue={page.seoTitle ?? ''} maxLength={70} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Description</label>
            <input name="seoDescription" defaultValue={page.seoDescription ?? ''} maxLength={160} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
        </div>

        <PageBlocksEditor initialBlocks={initialBlocks} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/dashboard/pages" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">{'\u0625\u0644\u063a\u0627\u0621'}</Link>
          <button type="submit" className="w-full rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] sm:w-auto">{'\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a'}</button>
        </div>
      </form>
    </div>
  )
}






