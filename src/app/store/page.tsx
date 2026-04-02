import Link from 'next/link'
import Script from 'next/script'
import type { Metadata } from 'next'
import { ChevronLeft, RotateCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Reveal } from '@/components/motion/reveal'
import { StaggerGroup } from '@/components/motion/stagger-group'
import { Card } from '@/components/ui/card'
import { buildCategorySlugSegment } from '@/lib/categories/category-slug'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import {
  getFeaturedProducts,
  getHeroSlides,
  getLatestProducts,
  getStoreCategories,
} from '@/lib/queries/storefront'
import { translateProducts } from '@/lib/products/translate'
import { getProductRatings } from '@/lib/queries/product-ratings'
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

export default async function StorefrontHomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { lang: langParam } = await searchParams
  const lang = langParam || 'ar'

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

  // Apply multi-language translations
  featuredProducts = translateProducts(featuredProducts, lang)
  latestProducts = translateProducts(latestProducts, lang)

  // Fetch product ratings
  const allProductIds = [...featuredProducts, ...latestProducts].map(p => p.id)
  const ratingsMap = await getProductRatings(store.id, allProductIds)

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
                avgRating={ratingsMap.get(product.id)?.avgRating}
                totalReviews={ratingsMap.get(product.id)?.totalReviews}
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
                avgRating={ratingsMap.get(product.id)?.avgRating}
                totalReviews={ratingsMap.get(product.id)?.totalReviews}
              />
            ))}
          </StaggerGroup>
        ) : (
          <p className="text-sm text-[var(--ds-text-muted)]">لا توجد منتجات متاحة الآن.</p>
        )}
      </section>

      <div id="recently-viewed-mount" />
      <Script id="rv-init" strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  try {
    var raw = localStorage.getItem('matjary-recently-viewed');
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var items = (parsed && parsed.state && parsed.state.items) || [];
    var ids = items.map(function(i){ return i.productId; }).slice(0, 6);
    if (ids.length === 0) return;
    fetch('/api/storefront/products?ids=' + encodeURIComponent(ids.join(',')))
      .then(function(r){ return r.json(); })
      .then(function(json){
        var products = (json && json.data && json.data.data) || (json && json.data) || [];
        if (!Array.isArray(products) || products.length === 0) return;
        var mount = document.getElementById('recently-viewed-mount');
        if (!mount) return;
        var storeSlug = ${JSON.stringify(store.slug)};
        var currency = ${JSON.stringify(store.settings.currency)};
        var html = '<section class="mx-auto w-full max-w-[1280px] px-4 pb-8 sm:px-6">';
        html += '<div class="mb-6 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary,#000)"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><h2 class="text-xl font-bold" style="color:var(--ds-text)">شاهدته مؤخراً</h2></div>';
        html += '<div class="flex gap-4 overflow-x-auto pb-2">';
        products.forEach(function(p){
          var price = Number(p.price);
          var img = (p.images && p.images[0]) ? '<img src="' + p.images[0] + '" alt="' + p.name + '" class="h-full w-full object-cover" loading="lazy"/>' : '<div class="flex h-full items-center justify-center text-xs" style="color:var(--ds-text-soft)">لا صورة</div>';
          var priceText = new Intl.NumberFormat('ar-EG', {style:'currency',currency:currency}).format(price);
          html += '<a href="/store/product/' + p.slug + '?store=' + storeSlug + '" class="group flex w-40 shrink-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg" style="border-color:var(--ds-divider);background:var(--surface-card,#fff)">';
          html += '<div class="aspect-square overflow-hidden" style="background:var(--surface-muted,#f1f5f9)">' + img + '</div>';
          html += '<div class="space-y-1 p-3"><h3 class="line-clamp-1 text-sm font-semibold" style="color:var(--ds-text)">' + p.name + '</h3>';
          html += '<span class="text-sm font-bold" style="color:var(--color-primary,#000)">' + priceText + '</span></div></a>';
        });
        html += '</div></section>';
        mount.innerHTML = html;
      }).catch(function(){});
  } catch(e){}
})();
          `,
        }}
      />

      <div id="compare-float-mount" />
      <Script id="cf-init" strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var KEY='matjary-compare',SLUG=${JSON.stringify(store.slug)};
  function getItems(){try{var r=localStorage.getItem(KEY);if(!r)return[];var p=JSON.parse(r);return(p.state&&p.state.items)||[]}catch(e){return[]}}
  function clearItems(){try{var r=localStorage.getItem(KEY);if(r){var p=JSON.parse(r);p.state.items=[];localStorage.setItem(KEY,JSON.stringify(p))}}catch(e){}renderBar()}
  var mount=document.getElementById('compare-float-mount');
  if(!mount)return;
  function renderBar(){
    var it=getItems();
    if(!it.length){mount.innerHTML='';return}
    var h='/store/compare?store='+encodeURIComponent(SLUG);
    mount.innerHTML='<div style="position:fixed;bottom:80px;inset-inline-start:16px;z-index:50;display:flex;align-items:center;gap:12px;border-radius:16px;border:1px solid #e5e7eb;background:#fff;padding:12px 16px;box-shadow:0 4px 12px rgba(0,0,0,.1)">'
      +'<span style="font-size:14px;font-weight:600;color:#1f2937">'+it.length+' \u0645\u0646\u062a\u062c \u0644\u0644\u0645\u0642\u0627\u0631\u0646\u0629</span>'
      +'<a href="'+h+'" style="border-radius:9999px;padding:6px 16px;font-size:12px;font-weight:700;color:#fff;background:#111827;text-decoration:none">\u0642\u0627\u0631\u0646 \u0627\u0644\u0622\u0646</a>'
      +'<button id="cmp-clr" style="padding:4px;color:#6b7280;background:none;border:none;cursor:pointer" aria-label="\u0645\u0633\u062d">\u2715</button>'
      +'</div>';
    var b=document.getElementById('cmp-clr');if(b)b.onclick=clearItems;
  }
  renderBar();
  setInterval(function(){renderBar()},500);
})();
          `,
        }}
      />
    </div>
  )
}
