import Link from 'next/link'
import type { Metadata } from 'next'
import { ChevronLeft, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Reveal, StaggerGroup } from '@/components/motion'
import { Card } from '@/components/ui'
import { buildCategorySlugSegment } from '@/lib/categories/category-slug'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import {
  getFeaturedProducts,
  getHeroSlides,
  getLatestProducts,
  getStoreCategories,
} from '@/lib/queries/storefront'
import { HeroSlider } from './_components/hero-slider'
import { ProductCard } from './_components/product-card'
import { StoreSearch } from './_components/store-search'
import { TrustBadges } from './_components/trust-badges'

export async function generateMetadata(): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}
  return {
    title: `${store.name} | المتجر`,
    description: `تسوّق أفضل المنتجات من ${store.name}`,
  }
}

export default async function StorefrontHomePage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  let slides: Awaited<ReturnType<typeof getHeroSlides>> = []
  let categories: Awaited<ReturnType<typeof getStoreCategories>> = []
  let featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  let latestProducts: Awaited<ReturnType<typeof getLatestProducts>> = []

  try {
    ;[slides, categories, featuredProducts, latestProducts] = await Promise.all([
      getHeroSlides(store.id),
      getStoreCategories(store.id, { limit: 8 }),
      getFeaturedProducts(store.id, { limit: 8 }),
      getLatestProducts(store.id, { limit: 8 }),
    ])
  } catch {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-[1280px] items-center justify-center px-4">
        <p className="rounded-[var(--ds-radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          حدث خطأ أثناء تحميل الصفحة. حاول مرة أخرى لاحقًا.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10 sm:space-y-12">
      <section className="mx-auto w-full max-w-[1280px] px-4 pt-6 sm:px-6">
        <div
          className="ds-hero-panel overflow-hidden px-6 py-8 sm:px-8 sm:py-10"
          style={{ backgroundColor: 'var(--surface-hero, #fff)' }}
        >
          <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal className="space-y-6">
              <div className="space-y-4">
                <span className="ds-pill text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  تسوّق من متجر موثوق
                </span>
                <div className="space-y-4">
                  <h1 className="ds-heading text-4xl font-black leading-tight text-[var(--ds-text)] md:text-6xl">{store.name}</h1>
                  <p className="max-w-2xl text-sm leading-8 text-[var(--ds-text-muted)] md:text-lg">
                    تجربة تسوق مصممة للوضوح والثقة مع منتجات مختارة، شحن أوضح، ودفع أكثر سلاسة من أول زيارة.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#featured-products"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:-translate-y-0.5 hover:opacity-95"
                  style={{ backgroundColor: 'var(--color-primary, #111827)' }}
                >
                  ابدأ التسوق
                  <ChevronLeft className="h-4 w-4" />
                </a>
                <a
                  href="#latest-products"
                  className="inline-flex items-center rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-6 py-3 text-sm font-semibold text-[var(--ds-text-muted)] shadow-[var(--ds-shadow-sm)] transition-all hover:-translate-y-0.5 hover:text-[var(--ds-text)]"
                >
                  أحدث المنتجات
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ds-text-muted)] sm:text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ds-surface-glass)] px-3 py-1.5 shadow-[var(--ds-shadow-sm)]"><ShieldCheck className="h-4 w-4" /> دفع آمن</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ds-surface-glass)] px-3 py-1.5 shadow-[var(--ds-shadow-sm)]"><Truck className="h-4 w-4" /> شحن سريع</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ds-surface-glass)] px-3 py-1.5 shadow-[var(--ds-shadow-sm)]"><RotateCcw className="h-4 w-4" /> استبدال أسهل</span>
              </div>

              <StoreSearch
                storeSlug={store.slug}
                currency={store.settings.currency}
                placeholder="ابحث عن منتج داخل المتجر..."
                className="max-w-xl"
              />
            </Reveal>

            <Reveal variant="scale">
              {slides.length > 0 ? (
                <HeroSlider slides={slides} storeSlug={store.slug} />
              ) : store.logoUrl ? (
                <div className="overflow-hidden rounded-[28px] bg-[var(--surface-card,#fff)] shadow-[var(--ds-shadow-lg)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={store.logoUrl} alt={`شعار ${store.name}`} className="aspect-[4/3] h-full w-full object-cover md:aspect-[21/9]" />
                </div>
              ) : (
                <Card variant="hero" className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(135deg,var(--surface-card,#fff),var(--surface-card-hover,#f8fafc))] md:aspect-[21/9]">
                  <span className="text-6xl font-black text-[color:color-mix(in_oklab,var(--color-primary,#111827)_18%,white)]">
                    {store.name.charAt(0)}
                  </span>
                </Card>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)]">تسوّق حسب التصنيف</h2>
            <p className="mt-1 text-sm text-[var(--ds-text-muted)]">ابدأ من القسم الأنسب ثم واصل التصفح بسرعة.</p>
          </div>
        </Reveal>

        {categories.length > 0 ? (
          <StaggerGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={storePath(`/category/${buildCategorySlugSegment(cat.id, cat.slug)}`, {
                  storeSlug: store.slug,
                })}
                className="rounded-[22px] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-4 py-4 text-center shadow-[var(--ds-shadow-sm)] transition-all hover:-translate-y-1 hover:border-[var(--border-strong,#d1d5db)] hover:bg-[var(--surface-card-hover,#fff)] hover:shadow-[var(--ds-shadow-md)]"
              >
                <span className="text-sm font-semibold text-[var(--ds-text)]">{cat.name}</span>
              </Link>
            ))}
          </StaggerGroup>
        ) : (
          <p className="text-sm text-[var(--ds-text-muted)]">لا توجد تصنيفات متاحة حاليًا.</p>
        )}
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <TrustBadges />
      </section>

      <section id="featured-products" className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
        <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)]">منتجات مميزة</h2>
            <p className="mt-1 text-sm text-[var(--ds-text-muted)]">أفضل ما يلفت الانتباه داخل المتجر الآن.</p>
          </div>
        </Reveal>
        {featuredProducts.length > 0 ? (
          <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={80}>
            {featuredProducts.map((product) => (
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
          <p className="text-sm text-[var(--ds-text-muted)]">لا توجد منتجات مميزة الآن.</p>
        )}
      </section>

      <section id="latest-products" className="mx-auto w-full max-w-[1280px] px-4 pb-8 sm:px-6 sm:pb-10">
        <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)]">أحدث المنتجات</h2>
            <p className="mt-1 text-sm text-[var(--ds-text-muted)]">كل ما تم إضافته حديثًا لتكتشف الجديد أولًا.</p>
          </div>
        </Reveal>
        {latestProducts.length > 0 ? (
          <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={80}>
            {latestProducts.map((product) => (
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
          <p className="text-sm text-[var(--ds-text-muted)]">لا توجد منتجات متاحة الآن.</p>
        )}
      </section>
    </div>
  )
}
