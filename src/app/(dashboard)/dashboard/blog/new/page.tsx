import Link from 'next/link'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
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

type NewBlogPostProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewBlogPostPage({ searchParams }: NewBlogPostProps) {
  const raw = await searchParams
  const error = getFirstParam(raw.error)

  async function createPostAction(formData: FormData) {
    'use server'

    const access = await getDashboardStoreAccessContext({ path: '/dashboard/blog/new' })
    if (access.status === 'unauthenticated') {
      redirect('/auth/sign-in?redirect_url=%2Fdashboard%2Fblog%2Fnew')
    }
    if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
      redirect('/forbidden?scope=dashboard-store')
    }
    const { store } = access

    const title = String(formData.get('title') ?? '').trim()
    const slugInput = String(formData.get('slug') ?? '').trim()
    const excerpt = String(formData.get('excerpt') ?? '').trim()
    const author = String(formData.get('author') ?? '').trim()
    const featuredImage = String(formData.get('featuredImage') ?? '').trim()
    const seoTitle = String(formData.get('seoTitle') ?? '').trim()
    const seoDescription = String(formData.get('seoDescription') ?? '').trim()
    const isPublished = formData.get('isPublished') === 'on'

    if (!title) redirect('/dashboard/blog/new?error=missing-title')

    const slug = normalizeSlug(slugInput || title)
    if (!slug) redirect('/dashboard/blog/new?error=missing-slug')

    const existing = await db
      .select({ id: storeBlogPosts.id })
      .from(storeBlogPosts)
      .where(and(eq(storeBlogPosts.storeId, store.id), eq(storeBlogPosts.slug, slug)))
      .limit(1)

    if (existing[0]) redirect('/dashboard/blog/new?error=slug-exists')

    const created = await db
      .insert(storeBlogPosts)
      .values({
        storeId: store.id,
        title,
        slug,
        content: '',
        featuredImage: featuredImage || null,
        excerpt: excerpt || null,
        author: author || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      })
      .returning({ id: storeBlogPosts.id })

    const createdId = created[0]?.id
    if (!createdId) redirect('/dashboard/blog')

    redirect(`/dashboard/blog/${createdId}/edit?saved=1`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">مقالة جديدة</h1>
        <Link href="/dashboard/blog" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">
          رجوع
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === 'missing-title' && 'عنوان المقالة مطلوب.'}
          {error === 'missing-slug' && 'الرابط مطلوب.'}
          {error === 'slug-exists' && 'هذا الرابط مستخدم بالفعل.'}
          {error !== 'missing-title' && error !== 'missing-slug' && error !== 'slug-exists' && 'حدث خطأ أثناء إنشاء المقالة.'}
        </div>
      ) : null}

      <form action={createPostAction} className="space-y-4 card-surface p-4 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">عنوان المقالة</label>
            <input name="title" required className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">الرابط (slug)</label>
            <input name="slug" placeholder="my-blog-post" className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" dir="ltr" />
            <p className="mt-1 text-xs text-[var(--ds-text-muted)]">اتركه فارغاً لتوليده تلقائياً من العنوان</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">المقتطف</label>
          <textarea name="excerpt" rows={2} maxLength={500} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" placeholder="ملخص قصير للمقالة..." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">اسم الكاتب</label>
            <input name="author" maxLength={100} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">رابط الصورة البارزة</label>
            <input name="featuredImage" type="url" className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" dir="ltr" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Title</label>
            <input name="seoTitle" maxLength={70} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--ds-text)]">SEO Description</label>
            <input name="seoDescription" maxLength={160} className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--ds-border)] px-3 py-2">
            <input type="checkbox" name="isPublished" />
            <span>نشر المقالة مباشرة</span>
          </label>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="text-sm font-semibold">ملاحظة:</p>
          <p className="mt-1 text-sm">بعد الإنشاء سيتم نقلك لشاشة تعديل المحتوى حيث يمكنك كتابة المقالة أو استخدام الذكاء الاصطناعي.</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Link href="/dashboard/blog" className="w-full rounded-lg border border-[var(--ds-border)] px-4 py-2 text-center hover:bg-[var(--ds-surface-muted)] sm:w-auto">إلغاء</Link>
          <button type="submit" className="w-full rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] sm:w-auto">إنشاء المقالة</button>
        </div>
      </form>
    </div>
  )
}
