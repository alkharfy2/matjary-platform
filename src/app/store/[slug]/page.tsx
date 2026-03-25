import { notFound, redirect } from 'next/navigation'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import {
  getStorefrontPage,
  getStorefrontProduct,
  resolveStorefrontCategory,
} from '@/lib/queries/storefront'
import { storePath } from '@/lib/tenant/store-path'
import {
  buildCategorySlugSegment,
  decodeCategorySegment,
  parseCategorySlugSegment,
} from '@/lib/categories/category-slug'

type StoreSlugFallbackPageProps = {
  params: Promise<{ slug: string }>
}

export default async function StoreSlugFallbackPage({ params }: StoreSlugFallbackPageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const decodedSegment = decodeCategorySegment(slug)
  const parsedCategorySegment = parseCategorySlugSegment(decodedSegment)

  const [category, product, page] = await Promise.all([
    resolveStorefrontCategory(store.id, {
      categoryId: parsedCategorySegment.categoryId,
      slug: parsedCategorySegment.slug,
    }),
    getStorefrontProduct(store.id, decodedSegment),
    getStorefrontPage(store.id, decodedSegment),
  ])

  if (category) {
    const categorySegment = buildCategorySlugSegment(category.id, category.slug)
    redirect(storePath(`/category/${categorySegment}` as `/${string}`, { storeSlug: store.slug }))
  }

  if (product) {
    redirect(storePath(`/product/${decodedSegment}` as `/${string}`, { storeSlug: store.slug }))
  }

  if (page) {
    redirect(storePath(`/page/${decodedSegment}` as `/${string}`, { storeSlug: store.slug }))
  }

  notFound()
}


