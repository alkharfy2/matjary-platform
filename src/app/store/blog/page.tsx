import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { Reveal, StaggerGroup } from '@/components/motion'

export async function generateMetadata(): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}
  return {
    title: `المدونة | ${store.name}`,
    description: `آخر المقالات والأخبار من ${store.name}`,
  }
}

export default async function StoreBlogPage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const blogEnabled = (store.settings as Record<string, unknown>)?.blogEnabled
  if (!blogEnabled) notFound()

  const posts = await db
    .select({
      id: storeBlogPosts.id,
      title: storeBlogPosts.title,
      slug: storeBlogPosts.slug,
      excerpt: storeBlogPosts.excerpt,
      featuredImage: storeBlogPosts.featuredImage,
      author: storeBlogPosts.author,
      publishedAt: storeBlogPosts.publishedAt,
    })
    .from(storeBlogPosts)
    .where(and(eq(storeBlogPosts.storeId, store.id), eq(storeBlogPosts.isPublished, true)))
    .orderBy(desc(storeBlogPosts.publishedAt))

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 py-8 sm:px-6">
      <Reveal>
        <h1 className="ds-heading text-3xl font-bold text-[var(--ds-text)]">المدونة</h1>
        <p className="mt-2 text-sm text-[var(--ds-text-muted)]">آخر المقالات والأخبار</p>
      </Reveal>

      {posts.length === 0 ? (
        <div className="py-16 text-center text-[var(--ds-text-muted)]">
          لا توجد مقالات منشورة بعد.
        </div>
      ) : (
        <StaggerGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Reveal key={post.id}>
              <Link
                href={storePath(`/blog/${post.slug}`, { storeSlug: store.slug })}
                className="group block overflow-hidden rounded-[var(--ds-radius-lg)] border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] shadow-[var(--ds-shadow-sm)] transition-shadow hover:shadow-[var(--ds-shadow-md)]"
              >
                {post.featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-[var(--ds-surface-muted)]">
                    <span className="text-4xl">📝</span>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h2 className="text-lg font-bold text-[var(--ds-text)] line-clamp-2 group-hover:text-[var(--color-primary,#111)]">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="text-sm text-[var(--ds-text-muted)] line-clamp-2">{post.excerpt}</p>
                  ) : null}
                  <div className="flex items-center gap-2 text-xs text-[var(--ds-text-muted)]">
                    {post.author ? <span>{post.author}</span> : null}
                    {post.author && post.publishedAt ? <span>·</span> : null}
                    {post.publishedAt ? (
                      <time dateTime={post.publishedAt.toISOString()}>
                        {new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(post.publishedAt)}
                      </time>
                    ) : null}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </StaggerGroup>
      )}
    </div>
  )
}
