import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { formatDate } from '@/lib/utils'

export default async function BlogPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const posts = await db
    .select()
    .from(storeBlogPosts)
    .where(eq(storeBlogPosts.storeId, store.id))
    .orderBy(desc(storeBlogPosts.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">المدونة</h1>
        <Link
          href="/dashboard/blog/new"
          className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)]"
        >
          + مقالة جديدة
        </Link>
      </div>

      <div className="overflow-hidden card-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-[var(--ds-surface-muted)]">
              <tr>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">العنوان</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">الرابط</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">الحالة</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">التاريخ</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--ds-text-muted)]">
                    لا توجد مقالات بعد. أنشئ مقالة جديدة بالزر أعلاه.
                  </td>
                </tr>
              ) : (
                posts.map((post) => (
                  <tr key={post.id} className="border-t border-[var(--ds-border)]/70">
                    <td className="px-6 py-4">
                      <p className="font-medium">{post.title}</p>
                      {post.excerpt ? <p className="mt-1 text-xs text-[var(--ds-text-muted)] line-clamp-1">{post.excerpt}</p> : null}
                    </td>
                    <td className="px-6 py-4 text-sm" dir="ltr">/{post.slug}</td>
                    <td className="px-6 py-4">
                      <span className={post.isPublished ? 'rounded-full bg-green-100 px-2 py-1 text-xs text-green-700' : 'rounded-full bg-[var(--ds-surface-muted)] px-2 py-1 text-xs text-[var(--ds-text)]'}>
                        {post.isPublished ? 'منشورة' : 'مسودة'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--ds-text-muted)]">{formatDate(post.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/blog/${post.id}/edit`} className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">
                          تعديل
                        </Link>
                        {post.isPublished ? (
                          <Link href={storePath(`/blog/${post.slug}`, { storeSlug: store.slug })} target="_blank" className="rounded-lg border border-[var(--ds-border)] px-3 py-1.5 text-sm hover:bg-[var(--ds-surface-muted)]">
                            معاينة
                          </Link>
                        ) : null}
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
