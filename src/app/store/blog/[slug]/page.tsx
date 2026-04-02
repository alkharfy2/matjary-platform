import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { Reveal } from '@/components/motion'
import { sanitizeHtml } from '@/lib/sanitize-html'

type BlogPostPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}

  const { slug } = await params

  const [post] = await db
    .select({
      title: storeBlogPosts.title,
      seoTitle: storeBlogPosts.seoTitle,
      seoDescription: storeBlogPosts.seoDescription,
      excerpt: storeBlogPosts.excerpt,
      featuredImage: storeBlogPosts.featuredImage,
      publishedAt: storeBlogPosts.publishedAt,
    })
    .from(storeBlogPosts)
    .where(and(eq(storeBlogPosts.storeId, store.id), eq(storeBlogPosts.slug, slug), eq(storeBlogPosts.isPublished, true)))
    .limit(1)

  if (!post) return {}

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      images: post.featuredImage ? [post.featuredImage] : [],
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const blogEnabled = (store.settings as Record<string, unknown>)?.blogEnabled
  if (!blogEnabled) notFound()

  const { slug } = await params

  const [post] = await db
    .select()
    .from(storeBlogPosts)
    .where(and(eq(storeBlogPosts.storeId, store.id), eq(storeBlogPosts.slug, slug), eq(storeBlogPosts.isPublished, true)))
    .limit(1)

  if (!post) notFound()

  const safeContent = sanitizeHtml(post.content)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.seoDescription || '',
    image: post.featuredImage || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    author: post.author ? { '@type': 'Person', name: post.author } : undefined,
    publisher: { '@type': 'Organization', name: store.name },
  }

  const shareText = encodeURIComponent(post.title)

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Reveal>
        <Link
          href={storePath('/blog', { storeSlug: store.slug })}
          className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        >
          ← العودة للمدونة
        </Link>

        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featuredImage}
            alt={post.title}
            className="mb-6 w-full rounded-[var(--ds-radius-lg)] object-cover"
            style={{ maxHeight: '400px' }}
          />
        ) : null}

        <h1 className="ds-heading text-3xl font-bold leading-tight text-[var(--ds-text)] sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-3 flex items-center gap-3 text-sm text-[var(--ds-text-muted)]">
          {post.author ? <span>{post.author}</span> : null}
          {post.author && post.publishedAt ? <span>·</span> : null}
          {post.publishedAt ? (
            <time dateTime={post.publishedAt.toISOString()}>
              {new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }).format(post.publishedAt)}
            </time>
          ) : null}
        </div>

        <div
          className="prose-store mt-8 leading-8"
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />

        {/* Share buttons */}
        <div className="mt-10 border-t border-[var(--border-soft,#e5e7eb)] pt-6">
          <p className="mb-3 text-sm font-semibold text-[var(--ds-text)]">شارك المقالة:</p>
          <div className="flex items-center gap-3">
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600"
            >
              WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?quote=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              Facebook
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600"
            >
              Twitter
            </a>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
