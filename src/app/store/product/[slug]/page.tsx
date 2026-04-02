import { getCurrentStore } from '@/lib/tenant/get-current-store'
import Script from 'next/script'
import {
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  getCrossSellProducts,
} from '@/lib/queries/storefront'
import { translateProduct, translateProducts } from '@/lib/products/translate'
import { notFound } from 'next/navigation'
import { ProductDetails } from './_components/product-details'
import { ProductReviews } from './_components/product-reviews'
import { ProductCard } from '@/app/store/_components/product-card'
import { getProductRatings } from '@/lib/queries/product-ratings'
import type { Metadata } from 'next'
import { parseProductSlugSegment } from '@/lib/products/product-slug'
import { sendConversionEvent } from '@/lib/tracking/facebook-capi'
import { generateProductEventId } from '@/lib/tracking/event-deduplication'
import { headers } from 'next/headers'
import { TrackRecentlyViewed } from './_components/track-recently-viewed'
import { RecentlyViewedSection } from '@/app/store/_components/recently-viewed-section'


type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
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

export default async function ProductPage({ params, searchParams }: PageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const { lang: langParam } = await searchParams
  const lang = langParam || 'ar'

  const rawProduct = await resolveProduct(store.id, slug)
  if (!rawProduct) notFound()

  const product = translateProduct(rawProduct, lang)

  let [related, crossSell] = await Promise.all([
    product.categoryId
      ? getRelatedProducts(store.id, product.categoryId, product.id, { limit: 4 })
      : Promise.resolve([]),
    getCrossSellProducts(store.id, product.id, { limit: 4 }),
  ])

  related = translateProducts(related, lang)
  crossSell = translateProducts(crossSell, lang)

  // Fetch product ratings for related + cross-sell
  const relatedIds = [...crossSell, ...related].map(p => p.id)
  const ratingsMap = relatedIds.length > 0 ? await getProductRatings(store.id, relatedIds) : new Map()

  // === CAPI: ViewContent (fire-and-forget) ===
  if (store.settings.facebookConversionApiEnabled &&
      store.settings.facebookPixelId &&
      store.settings.facebookConversionApiToken) {
    const headersList = await headers()
    const eventId = generateProductEventId('viewcontent', product.id)

    sendConversionEvent(
      {
        pixelId: store.settings.facebookPixelId,
        accessToken: store.settings.facebookConversionApiToken,
        testEventCode: store.settings.facebookTestEventCode,
      },
      'ViewContent',
      {
        clientIpAddress: headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        clientUserAgent: headersList.get('user-agent') ?? undefined,
      },
      {
        contentIds: [product.id],
        contentName: product.name,
        contentType: 'product',
        value: Number(product.price),
        currency: store.settings.currency,
      },
      `https://${store.slug}.matjary.com/product/${product.slug}`,
      eventId,
    ).catch(() => {})
  }

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

      {/* Product Reviews */}
      {store.settings.reviewsEnabled !== false && (
        <ProductReviews
          productId={product.id}
          storeSlug={store.slug}
          currency={store.settings.currency}
        />
      )}

      {/* منتجات يتم شراؤها معاً (Cross-sell) */}
      {crossSell.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold leading-snug text-[var(--ds-text)] md:text-2xl mb-6">يُشترى معاً عادةً</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {crossSell.map((p) => (
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
                avgRating={ratingsMap.get(p.id)?.avgRating}
                totalReviews={ratingsMap.get(p.id)?.totalReviews}
              />
            ))}
          </div>
        </section>
      )}

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
                avgRating={ratingsMap.get(p.id)?.avgRating}
                totalReviews={ratingsMap.get(p.id)?.totalReviews}
              />
            ))}
          </div>
        </section>
      )}

      <TrackRecentlyViewed productId={product.id} />
      <RecentlyViewedSection
        storeSlug={store.slug}
        currency={store.settings.currency}
        excludeProductId={product.id}
      />
      <div id="compare-float-mount" />
      <Script id="cf-init-pdp" strategy="afterInteractive"
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


