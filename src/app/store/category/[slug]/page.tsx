import Link from 'next/link'
import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { Reveal, StaggerGroup } from '@/components/motion'
import { Card } from '@/components/ui'
import { ProductCard } from '@/app/store/_components/product-card'
import {
  buildCategorySlugSegment,
  decodeCategorySegment,
  parseCategorySlugSegment,
} from '@/lib/categories/category-slug'
import { getCategoryWithProducts } from '@/lib/queries/storefront'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'

type PageProps = {
  params: Promise<{ slug: string }>
}

async function resolveCategoryBySegment(storeId: string, rawSegment: string) {
  const decodedSegment = decodeCategorySegment(rawSegment)
  const parsedSegment = parseCategorySlugSegment(decodedSegment)

  const result = await getCategoryWithProducts(storeId, {
    categoryId: parsedSegment.categoryId,
    slug: parsedSegment.slug,
  })

  return { decodedSegment, result }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}

  const { slug } = await params
  const { result } = await resolveCategoryBySegment(store.id, slug)
  if (!result) return {}

  return {
    title: `${result.category.name} | ${store.name}`,
    description: result.category.description ?? `تصفّح منتجات ${result.category.name} في ${store.name}`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const { decodedSegment, result } = await resolveCategoryBySegment(store.id, slug)
  if (!result) notFound()

  const { category, products } = result
  const canonicalSegment = buildCategorySlugSegment(category.id, category.slug)

  if (decodedSegment !== canonicalSegment) {
    redirect(storePath(`/category/${canonicalSegment}` as `/${string}`, { storeSlug: store.slug }))
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      <section className="ds-hero-panel px-6 py-8 sm:px-8">
        <Reveal className="space-y-3">
          <span className="ds-pill text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            تصفح من داخل القسم المناسب
          </span>
          <h1 className="ds-heading text-3xl font-black text-[var(--ds-text)] md:text-5xl">{category.name}</h1>
          <p className="max-w-2xl text-sm leading-8 text-[var(--ds-text-muted)] md:text-base">
            {category.description ?? `اكتشف أفضل المنتجات الموجودة داخل قسم ${category.name}.`}
          </p>
        </Reveal>
      </section>

      <section className="mt-8">
        {products.length > 0 ? (
          <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={80}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                storeSlug={store.slug}
                name={product.name}
                slug={product.slug}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                images={product.images}
                stock={product.stock}
                isFeatured={product.isFeatured}
                variants={product.variants}
                currency={store.settings.currency}
              />
            ))}
          </StaggerGroup>
        ) : (
          <Card variant="feature" className="mx-auto max-w-xl px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--ds-text)]">لا توجد منتجات في هذا التصنيف حاليًا</h2>
            <p className="mt-2 text-sm text-[var(--ds-text-muted)]">جرّب تصنيفًا آخر أو عُد إلى الصفحة الرئيسية لمتابعة التصفح.</p>
            <div className="mt-6">
              <Link
                href={storePath('/', { storeSlug: store.slug })}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
                style={{ backgroundColor: 'var(--color-primary, #000)' }}
              >
                العودة للرئيسية
              </Link>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
