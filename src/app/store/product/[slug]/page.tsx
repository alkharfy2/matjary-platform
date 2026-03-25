import { getCurrentStore } from '@/lib/tenant/get-current-store'
import {
  getProductById,
  getProductBySlug,
  getRelatedProducts,
} from '@/lib/queries/storefront'
import { notFound } from 'next/navigation'
import { ProductDetails } from './_components/product-details'
import { ProductCard } from '@/app/store/_components/product-card'
import type { Metadata } from 'next'
import { parseProductSlugSegment } from '@/lib/products/product-slug'

type PageProps = {
  params: Promise<{ slug: string }>
}

async function resolveProduct(storeId: string, rawSegment: string) {
  let decodedSegment = rawSegment
  try {
    decodedSegment = decodeURIComponent(rawSegment)
  } catch {
    decodedSegment = rawSegment
  }
  const parsedSegment = parseProductSlugSegment(decodedSegment)

  if (parsedSegment.productId) {
    const byId = await getProductById(storeId, parsedSegment.productId)
    if (byId) return byId
  }

  return getProductBySlug(storeId, parsedSegment.slug)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}

  const { slug } = await params
  const product = await resolveProduct(store.id, slug)
  if (!product) return {}

  return {
    title: `${product.name} | ${store.name}`,
    description: product.shortDescription ?? `تسوّق ${product.name} من ${store.name}`,
    openGraph: {
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const product = await resolveProduct(store.id, slug)
  if (!product) notFound()

  const related = product.categoryId
    ? await getRelatedProducts(store.id, product.categoryId, product.id, { limit: 4 })
    : []

  return (
    <div className="container mx-auto px-4 py-8">
      <ProductDetails
        productId={product.id}
        name={product.name}
        slug={product.slug}
        price={product.price}
        compareAtPrice={product.compareAtPrice}
        images={product.images}
        stock={product.stock}
        variants={product.variants}
        currency={store.settings.currency}
        description={product.description}
      />

      {/* منتجات مشابهة */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold leading-snug text-[var(--ds-text)] md:text-2xl mb-6">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                storeSlug={store.slug}
                name={p.name}
                slug={p.slug}
                price={p.price}
                compareAtPrice={p.compareAtPrice}
                images={p.images}
                stock={p.stock}
                isFeatured={p.isFeatured}
                variants={p.variants}
                currency={store.settings.currency}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}


