import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { storeBlogPosts } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { BlogEditForm } from './blog-edit-form'

type EditBlogPostProps = {
  params: Promise<{ id: string }>
}

export default async function EditBlogPostPage({ params }: EditBlogPostProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { id } = await params

  const [post] = await db
    .select()
    .from(storeBlogPosts)
    .where(and(eq(storeBlogPosts.id, id), eq(storeBlogPosts.storeId, store.id)))
    .limit(1)

  if (!post) notFound()

  return (
    <BlogEditForm
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        featuredImage: post.featuredImage,
        excerpt: post.excerpt,
        author: post.author,
        isPublished: post.isPublished,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
      }}
    />
  )
}
