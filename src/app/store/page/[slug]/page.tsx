import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { PageBlock, ProductVariant } from '@/db/schema'
import { ProductCard } from '@/app/store/_components/product-card'
import { getPageBySlug, getProductsForBlock } from '@/lib/queries/storefront'
import { sanitizeHtml } from '@/lib/sanitize-html'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'
import { PageForm } from './_components/page-form'

type ProductItem = {
  id: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  shortDescription: string | null
  stock: number
  isFeatured: boolean
  variants: ProductVariant[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const store = await getCurrentStore()
  if (!store) return {}

  const { slug } = await params
  const page = await getPageBySlug(store.id, slug)
  if (!page) return {}

  return {
    title: `${page.seoTitle ?? page.title} | ${store.name}`,
    description: page.seoDescription ?? undefined,
  }
}

function toStoreAwareHref(url: string, storeSlug: string): string {
  const trimmed = url.trim()
  if (!trimmed.startsWith('/')) return trimmed
  return storePath(trimmed as `/${string}`, { storeSlug })
}

function BlockShell({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={`mb-8 ${className}`.trim()}>{children}</section>
}

function BlockHeading({
  title,
  description,
}: {
  title?: string
  description?: string
}) {
  if (!title && !description) return null

  return (
    <div className="mb-5 space-y-2">
      {title ? <h2 className="ds-heading text-2xl font-black text-[var(--ds-text)] md:text-3xl">{title}</h2> : null}
      {description ? <p className="max-w-3xl text-sm leading-7 text-[var(--ds-text-muted)] md:text-base">{description}</p> : null}
    </div>
  )
}

function HeroBlock({
  block,
  storeSlug,
}: {
  block: PageBlock
  storeSlug: string
}) {
  const {
    title,
    subtitle,
    imageUrl,
    buttonText,
    buttonUrl,
    badgeText,
    featureCard1,
    featureCard2,
    featureCard3,
    featureCards,
  } = block.content as Record<string, unknown>
  const heroTitle = typeof title === 'string' ? title : undefined
  const heroSubtitle = typeof subtitle === 'string' ? subtitle : undefined
  const heroImage = typeof imageUrl === 'string' ? imageUrl : undefined
  const ctaLabel = typeof buttonText === 'string' ? buttonText : undefined
  const ctaUrl = typeof buttonUrl === 'string' ? buttonUrl : undefined

  const badgeLabel = typeof badgeText === 'string' && badgeText.trim().length > 0
    ? badgeText
    : '\u0635\u0641\u062d\u0629 \u0645\u0645\u064a\u0632\u0629 \u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u062a\u062c\u0631'

  const featureCardsFromArray = Array.isArray(featureCards)
    ? featureCards
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : []

  const featureCardsFromFields = [featureCard1, featureCard2, featureCard3]
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  const displayFeatureCards =
    featureCardsFromArray.length > 0
      ? featureCardsFromArray.slice(0, 3)
      : featureCardsFromFields.length > 0
      ? featureCardsFromFields.slice(0, 3)
      : [
          '\u062a\u0635\u0645\u064a\u0645 \u0623\u0642\u0631\u0628 \u0644\u0644\u0647\u0648\u064a\u0629 \u0627\u0644\u0628\u0635\u0631\u064a\u0629 \u0644\u0644\u0645\u062a\u062c\u0631',
          '\u062d\u0631\u0643\u0629 \u0623\u062e\u0641 \u0648\u062a\u062d\u0648\u064a\u0644 \u0623\u0648\u0636\u062d \u0644\u0644\u0632\u0627\u0626\u0631',
          '\u0623\u0642\u0633\u0627\u0645 \u0645\u0631\u0646\u0629 \u064a\u0645\u0643\u0646 \u062a\u062e\u0635\u064a\u0635\u0647\u0627 \u0628\u0633\u0647\u0648\u0644\u0629',
        ]

  return (
    <BlockShell>
      <div className="ds-hero-panel isolate">
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt={heroTitle ?? ''}
              width={1600}
              height={900}
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.68),rgba(20,80,209,0.18)_55%,rgba(244,127,44,0.18))]" />
          </>
        ) : null}
        <div className="relative grid gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-12">
          <div className="space-y-5">
            <span className="ds-pill text-xs font-semibold text-[var(--ds-text)]">
              {badgeLabel}
            </span>
            {heroTitle ? (
              <h2 className="ds-heading max-w-3xl text-3xl font-black leading-tight text-[var(--ds-text)] md:text-5xl">
                {heroTitle}
              </h2>
            ) : null}
            {heroSubtitle ? (
              <p className="max-w-2xl text-base leading-8 text-[var(--ds-text-muted)] md:text-lg">
                {heroSubtitle}
              </p>
            ) : null}
            {ctaLabel && ctaUrl ? (
              <a
                href={toStoreAwareHref(ctaUrl, storeSlug)}
                className="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all duration-[var(--ds-motion-base)] hover:-translate-y-0.5 hover:opacity-95"
                style={{ backgroundColor: 'var(--color-primary, #000)' }}
              >
                {ctaLabel}
              </a>
            ) : null}
          </div>

          <div className="grid gap-3 self-end sm:grid-cols-2 md:grid-cols-1">
            {displayFeatureCards.map((item) => (
              <div
                key={item}
                className="glass-panel rounded-[24px] px-4 py-4 text-sm font-medium leading-7 text-[var(--ds-text)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BlockShell>
  )
}

function TextBlock({ block }: { block: PageBlock }) {
  const { title, body, subtitle } = block.content as Record<string, unknown>
  const textTitle = typeof title === 'string' ? title : undefined
  const textBody = typeof body === 'string' ? body : undefined
  const textSubtitle = typeof subtitle === 'string' ? subtitle : undefined

  return (
    <BlockShell>
      <div className="surface-panel-elevated px-6 py-6 md:px-8 md:py-8">
        <BlockHeading title={textTitle} description={textSubtitle} />
        {textBody ? (
          <div
            className="prose prose-lg max-w-none leading-relaxed text-[var(--ds-text)] prose-headings:text-[var(--ds-text)] prose-p:text-[var(--ds-text)] prose-li:text-[var(--ds-text)] prose-strong:text-[var(--ds-text)] prose-a:text-[var(--color-primary,#000)]"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(textBody) }}
          />
        ) : null}
      </div>
    </BlockShell>
  )
}

function ImageBlock({ block }: { block: PageBlock }) {
  const { src, alt, caption } = block.content as Record<string, unknown>
  const imageSrc = typeof src === 'string' ? src : undefined
  const imageAlt = typeof alt === 'string' ? alt : ''
  const imageCaption = typeof caption === 'string' ? caption : undefined

  if (!imageSrc) return null

  return (
    <BlockShell>
      <figure className="surface-panel overflow-hidden p-3 sm:p-4">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={1600}
          height={900}
          className="h-auto w-full rounded-[24px] object-cover"
        />
        {imageCaption ? (
          <figcaption className="px-3 pt-4 text-center text-sm leading-7 text-[var(--ds-text-muted)]">
            {imageCaption}
          </figcaption>
        ) : null}
      </figure>
    </BlockShell>
  )
}

function CtaBlock({
  block,
  storeSlug,
}: {
  block: PageBlock
  storeSlug: string
}) {
  const {
    title,
    description,
    buttonText,
    buttonUrl,
  } = block.content as Record<string, unknown>
  const ctaTitle = typeof title === 'string' ? title : undefined
  const ctaDescription = typeof description === 'string' ? description : undefined
  const ctaLabel = typeof buttonText === 'string' ? buttonText : undefined
  const ctaUrl = typeof buttonUrl === 'string' ? buttonUrl : undefined

  return (
    <BlockShell>
      <div className="ds-hero-panel px-6 py-8 text-center md:px-10 md:py-10">
        <div className="relative z-[1] mx-auto max-w-3xl space-y-4">
          <span className="ds-pill text-xs font-semibold text-[var(--ds-text)]">
            دعوة واضحة لاتخاذ إجراء
          </span>
          {ctaTitle ? <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)] md:text-4xl">{ctaTitle}</h2> : null}
          {ctaDescription ? (
            <p className="text-sm leading-7 text-[var(--ds-text-muted)] md:text-base">
              {ctaDescription}
            </p>
          ) : null}
          {ctaLabel && ctaUrl ? (
            <a
              href={toStoreAwareHref(ctaUrl, storeSlug)}
              className="inline-flex items-center justify-center rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all duration-[var(--ds-motion-base)] hover:-translate-y-0.5 hover:opacity-95"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              {ctaLabel}
            </a>
          ) : null}
        </div>
      </div>
    </BlockShell>
  )
}

function VideoBlock({ block }: { block: PageBlock }) {
  const { url, title, description } = block.content as Record<string, unknown>
  const videoUrl = typeof url === 'string' ? url : undefined
  const videoTitle = typeof title === 'string' ? title : undefined
  const videoDescription = typeof description === 'string' ? description : undefined

  if (!videoUrl) return null

  return (
    <BlockShell>
      <div className="surface-panel-elevated px-5 py-5 md:px-6">
        <BlockHeading title={videoTitle} description={videoDescription} />
        <div className="overflow-hidden rounded-[24px] border border-[var(--ds-border)] shadow-[var(--ds-shadow-sm)]">
          <div className="relative aspect-video w-full bg-[var(--ds-surface-muted)]">
            <iframe
              src={videoUrl}
              title={videoTitle ?? 'فيديو'}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </BlockShell>
  )
}

function GalleryBlock({ block }: { block: PageBlock }) {
  const { title, images, description } = block.content as Record<string, unknown>
  const imageList = Array.isArray(images) ? (images as Array<{ src: string; alt?: string }>) : []
  const galleryTitle = typeof title === 'string' ? title : undefined
  const galleryDescription = typeof description === 'string' ? description : undefined

  if (imageList.length === 0) return null

  return (
    <BlockShell>
      <div className="surface-panel px-5 py-5 md:px-6">
        <BlockHeading title={galleryTitle} description={galleryDescription} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imageList.map((image, index) => (
            <div key={`${image.src}-${index}`} className="overflow-hidden rounded-[24px] border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-sm)]">
              <Image
                src={image.src}
                alt={image.alt ?? ''}
                width={700}
                height={700}
                className="aspect-square w-full object-cover transition-transform duration-[700ms] ease-out hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </BlockShell>
  )
}

function FaqBlock({ block }: { block: PageBlock }) {
  const { title, items, description } = block.content as Record<string, unknown>
  const faqItems = Array.isArray(items) ? (items as Array<{ question: string; answer: string }>) : []
  const faqTitle = typeof title === 'string' ? title : undefined
  const faqDescription = typeof description === 'string' ? description : undefined

  if (faqItems.length === 0) return null

  return (
    <BlockShell>
      <div className="surface-panel-elevated px-5 py-5 md:px-6">
        <BlockHeading title={faqTitle} description={faqDescription} />
        <div className="space-y-3">
          {faqItems.map((faq, index) => (
            <details
              key={`${faq.question}-${index}`}
              className="group rounded-[22px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-5 py-4 shadow-[var(--ds-shadow-sm)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[var(--ds-text)] md:text-base">
                <span>{faq.question}</span>
                <span className="text-lg text-[var(--ds-text-muted)] transition-transform duration-[var(--ds-motion-base)] group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pt-3 text-sm leading-7 text-[var(--ds-text-muted)] md:text-base">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </BlockShell>
  )
}

function TestimonialsBlock({ block }: { block: PageBlock }) {
  const { title, items, description } = block.content as Record<string, unknown>
  const testimonials = Array.isArray(items) ? (items as Array<{ name: string; text: string; role?: string }>) : []
  const testimonialsTitle = typeof title === 'string' ? title : undefined
  const testimonialsDescription = typeof description === 'string' ? description : undefined

  if (testimonials.length === 0) return null

  return (
    <BlockShell>
      <div className="surface-panel px-5 py-5 md:px-6">
        <BlockHeading title={testimonialsTitle} description={testimonialsDescription} />
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <blockquote
              key={`${testimonial.name}-${index}`}
              className="motion-card-hover rounded-[24px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] p-6 shadow-[var(--ds-shadow-sm)]"
            >
              <p className="text-sm leading-7 text-[var(--ds-text)] md:text-base">
                &ldquo;{testimonial.text}&rdquo;
              </p>
              <footer className="mt-4 border-t border-[var(--ds-border)] pt-4">
                <p className="font-bold text-[var(--ds-text)]">{testimonial.name}</p>
                {testimonial.role ? (
                  <p className="text-sm text-[var(--ds-text-muted)]">{testimonial.role}</p>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </BlockShell>
  )
}

function ProductsBlock({
  block,
  products,
  currency,
  storeSlug,
}: {
  block: PageBlock
  products: ProductItem[]
  currency: string
  storeSlug: string
}) {
  const { title, description } = block.content as Record<string, unknown>
  const productsTitle = typeof title === 'string' ? title : undefined
  const productsDescription = typeof description === 'string' ? description : undefined

  return (
    <BlockShell>
      <div className="surface-panel-elevated px-5 py-5 md:px-6">
        <BlockHeading title={productsTitle ?? 'منتجات مختارة'} description={productsDescription} />
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                storeSlug={storeSlug}
                name={product.name}
                slug={product.slug}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                images={product.images}
                stock={product.stock}
                isFeatured={product.isFeatured}
                variants={product.variants}
                currency={currency}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-6 py-10 text-center text-sm leading-7 text-[var(--ds-text-muted)]">
            لا توجد منتجات متاحة لهذا القسم حاليًا.
          </div>
        )}
      </div>
    </BlockShell>
  )
}

function FormBlock({ block }: { block: PageBlock }) {
  const { title, description } = block.content as Record<string, unknown>

  return (
    <PageForm
      title={typeof title === 'string' ? title : undefined}
      description={typeof description === 'string' ? description : undefined}
    />
  )
}

function renderBlock(
  block: PageBlock,
  productsMap: Map<string, ProductItem[]>,
  currency: string,
  storeSlug: string
) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock key={block.id} block={block} storeSlug={storeSlug} />
    case 'text':
      return <TextBlock key={block.id} block={block} />
    case 'image':
      return <ImageBlock key={block.id} block={block} />
    case 'cta':
      return <CtaBlock key={block.id} block={block} storeSlug={storeSlug} />
    case 'video':
      return <VideoBlock key={block.id} block={block} />
    case 'gallery':
      return <GalleryBlock key={block.id} block={block} />
    case 'faq':
      return <FaqBlock key={block.id} block={block} />
    case 'testimonials':
      return <TestimonialsBlock key={block.id} block={block} />
    case 'products':
      return (
        <ProductsBlock
          key={block.id}
          block={block}
          products={productsMap.get(block.id) ?? []}
          currency={currency}
          storeSlug={storeSlug}
        />
      )
    case 'form':
      return <FormBlock key={block.id} block={block} />
    default:
      return null
  }
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const { slug } = await params
  const page = await getPageBySlug(store.id, slug)
  if (!page) notFound()

  const blocks = [...page.content].sort((a, b) => a.order - b.order)
  const productBlocks = blocks.filter((block) => block.type === 'products')
  const productsMap = new Map<string, ProductItem[]>()

  if (productBlocks.length > 0) {
    const results = await Promise.all(
      productBlocks.map((block) => {
        const content = block.content as Record<string, unknown>
        const categoryId = typeof content.categoryId === 'string' ? content.categoryId : null
        const limit = typeof content.limit === 'number' ? content.limit : 8
        const featured = typeof content.featured === 'boolean' ? content.featured : false

        return getProductsForBlock(store.id, { limit, categoryId, featured })
      })
    )

    productBlocks.forEach((block, index) => {
      productsMap.set(block.id, results[index] ?? [])
    })
  }

  const currency = store.settings.currency ?? 'EGP'
  const pageDescription = page.seoDescription ?? 'صفحة مخصصة داخل المتجر بنفس الهوية البصرية الجديدة.'
  const pageLeadCardText = blocks.reduce<string | null>((value, block) => {
    if (value) return value
    if (block.type !== 'hero') return null
    const content = block.content as Record<string, unknown>
    const raw = content.pageLeadCardText
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
  }, null)

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 sm:py-12">
      <section className="ds-hero-panel mb-8 px-6 py-8 md:px-10 md:py-10">
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="ds-pill text-xs font-semibold text-[var(--ds-text)]">
              صفحة داخل متجر {store.name}
            </span>
            <h1 className="ds-heading text-3xl font-black leading-tight text-[var(--ds-text)] md:text-5xl">
              {page.title}
            </h1>
            <p className="text-sm leading-7 text-[var(--ds-text-muted)] md:text-base">
              {pageDescription}
            </p>
          </div>
          {pageLeadCardText ? (
            <div className="glass-panel max-w-sm rounded-[24px] px-5 py-4 text-sm leading-7 text-[var(--ds-text-muted)]">
              {pageLeadCardText}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-5xl">
        {blocks.length > 0 ? (
          blocks.map((block) => renderBlock(block, productsMap, currency, store.slug))
        ) : (
          <div className="surface-panel-elevated px-6 py-14 text-center">
            <h2 className="ds-heading text-2xl font-black text-[var(--ds-text)]">
              لا يوجد محتوى في هذه الصفحة بعد
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
              يمكنك إضافة blocks من لوحة التحكم وستظهر هنا بنفس النظام البصري الجديد.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


