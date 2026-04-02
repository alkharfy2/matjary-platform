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
import { getStorefrontProducts } from '@/lib/queries/storefront'
import { resolveStorefrontCategory } from '@/lib/queries/storefront'
import { getProductRatings } from '@/lib/queries/product-ratings'
import { translateProducts } from '@/lib/products/translate'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { PaginationBar } from '@/components/patterns'
import { FilterSidebar } from './_components/filter-sidebar'
import { FilterDrawer } from './_components/filter-drawer'
import { SortSelect } from './_components/sort-select'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseFilters(raw: Record<string, string | string[] | undefined>) {
  const minPrice = Number(getFirstParam(raw.minPrice))
  const maxPrice = Number(getFirstParam(raw.maxPrice))
  const rating = Number(getFirstParam(raw.rating))
  const page = Number(getFirstParam(raw.page)) || 1
  const limit = 20
  const sort = (getFirstParam(raw.sort) || 'newest') as 'newest' | 'price-asc' | 'price-desc' | 'name'
  const inStock = getFirstParam(raw.inStock) === 'true'
  const onSale = getFirstParam(raw.onSale) === 'true'

  return {
    minPrice: !isNaN(minPrice) && minPrice > 0 ? minPrice : undefined,
    maxPrice: !isNaN(maxPrice) && maxPrice > 0 ? maxPrice : undefined,
    rating: !isNaN(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    inStock: inStock || undefined,
    onSale: onSale || undefined,
    sort,
    page,
    limit,
  }
}

function buildFilterQuery(
  categorySegment: string,
  filters: ReturnType<typeof parseFilters>,
  patch: Partial<ReturnType<typeof parseFilters>>
) {
  const next = { ...filters, ...patch }
  const params = new URLSearchParams()
  if (next.minPrice) params.set('minPrice', String(next.minPrice))
  if (next.maxPrice) params.set('maxPrice', String(next.maxPrice))
  if (next.rating) params.set('rating', String(next.rating))
  if (next.inStock) params.set('inStock', 'true')
  if (next.onSale) params.set('onSale', 'true')
  if (next.sort && next.sort !== 'newest') params.set('sort', next.sort)
  if (next.page && next.page > 1) params.set('page', String(next.page))

  const query = params.toString()
  return `/category/${categorySegment}${query ? '?' + query : ''}`
}

async function resolveCategoryBySegment(storeId: string, rawSegment: string) {
  const decodedSegment = decodeCategorySegment(rawSegment)
  const parsedSegment = parseCategorySlugSegment(decodedSegment)

  const category = await resolveStorefrontCategory(storeId, {
    categoryId: parsedSegment.categoryId,
    slug: parsedSegment.slug,
  })

  return { decodedSegment, category }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}

  const { slug } = await params
  const { category } = await resolveCategoryBySegment(store.id, slug)
  if (!category) return {}

  return {
    title: `${category.name} | ${store.name}`,
    description: category.description ?? `تصفّح منتجات ${category.name} في ${store.name}`,
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const rawParams = await searchParams
  const langParam = getFirstParam(rawParams.lang) || 'ar'

  const { decodedSegment, category } = await resolveCategoryBySegment(store.id, slug)
  if (!category) notFound()

  const canonicalSegment = buildCategorySlugSegment(category.id, category.slug)
  if (decodedSegment !== canonicalSegment) {
    redirect(storePath(`/category/${canonicalSegment}` as `/${string}`, { storeSlug: store.slug }))
  }

  const filters = parseFilters(rawParams)

  const result = await getStorefrontProducts(store.id, {
    categoryId: category.id,
    ...filters,
  })

  const products = translateProducts(result.products, langParam)
  const ratingsMap = await getProductRatings(store.id, products.map(p => p.id))

  const hasPrevPage = result.page > 1
  const hasNextPage = result.page < result.totalPages

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Hero */}
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

      {/* Controls bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FilterDrawer
            filters={filters}
            categorySegment={canonicalSegment}
          />
          <p className="text-sm text-[var(--ds-text-muted)]">
            {result.total} منتج
          </p>
        </div>
        <SortSelect
          currentSort={filters.sort}
          categorySegment={canonicalSegment}
          filters={filters}
        />
      </div>

      {/* Content */}
      <div className="mt-6 flex gap-6">
        {/* Sidebar — Desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterSidebar
            filters={filters}
            categorySegment={canonicalSegment}
          />
        </aside>

        {/* Products Grid */}
        <section className="flex-1">
          {products.length > 0 ? (
            <>
              <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={80}>
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
                    avgRating={ratingsMap.get(product.id)?.avgRating}
                    totalReviews={ratingsMap.get(product.id)?.totalReviews}
                  />
                ))}
              </StaggerGroup>

              {result.totalPages > 1 && (
                <div className="mt-8">
                  <PaginationBar
                    page={result.page}
                    totalPages={result.totalPages}
                    summary={`صفحة ${result.page} من ${result.totalPages} (إجمالي ${result.total})`}
                    prevHref={hasPrevPage
                      ? storePath(buildFilterQuery(canonicalSegment, filters, { page: result.page - 1 }) as `/${string}`, { storeSlug: store.slug })
                      : undefined}
                    nextHref={hasNextPage
                      ? storePath(buildFilterQuery(canonicalSegment, filters, { page: result.page + 1 }) as `/${string}`, { storeSlug: store.slug })
                      : undefined}
                  />
                </div>
              )}
            </>
          ) : (
            <Card variant="feature" className="mx-auto max-w-xl px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-[var(--ds-text)]">لا توجد منتجات مطابقة</h2>
              <p className="mt-2 text-sm text-[var(--ds-text-muted)]">جرّب تغيير الفلاتر الحالية أو مسحها.</p>
              <div className="mt-6">
                <Link
                  href={storePath(`/category/${canonicalSegment}` as `/${string}`, { storeSlug: store.slug })}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
                  style={{ backgroundColor: 'var(--color-primary, #000)' }}
                >
                  مسح الفلاتر
                </Link>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}
