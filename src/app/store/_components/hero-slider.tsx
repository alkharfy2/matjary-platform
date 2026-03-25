'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { storePath } from '@/lib/tenant/store-path'
import { cn } from '@/lib/utils'

export type HeroSlide = {
  id: string
  title: string | null
  subtitle: string | null
  imageUrl: string
  linkUrl: string | null
  buttonText: string | null
  sortOrder: number
}

type HeroSliderProps = {
  slides: HeroSlide[]
  storeSlug: string
}

// يحول أي رابط داخلي لمسار المتجر الحالي حتى لا نخرج من نطاق المتجر.
function toStoreAwareHref(url: string, storeSlug: string): string {
  const trimmed = url.trim()
  if (!trimmed.startsWith('/')) return trimmed
  return storePath(trimmed as `/${string}`, { storeSlug })
}

// يقبل فقط الروابط المحلية أو http/https لتجنب حقن روابط غير متوقعة.
function getSafeImageUrl(url: string | null | undefined): string | null {
  const value = String(url ?? '').trim()
  if (!value) return null
  if (value.startsWith('/') || /^https?:\/\//i.test(value)) return value
  return null
}

export function HeroSlider({ slides, storeSlug }: HeroSliderProps) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const previous = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

  useEffect(() => {
    // تشغيل تلقائي عند وجود أكثر من شريحة، مع تنظيف المؤقت عند أي إعادة render.
    if (slides.length <= 1) return

    const timer = setInterval(next, 5200)
    return () => clearInterval(timer)
  }, [slides.length, next])

  if (slides.length === 0) return null

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[var(--surface-card,#fff)] md:aspect-[21/9]">
      {/* كل شريحة تتواجد في نفس المكان، ونُظهر فقط الشريحة الحالية عبر opacity. */}
      {slides.map((slide, index) => {
        const safeImageUrl = getSafeImageUrl(slide.imageUrl)
        const active = index === current
        const content = (
          <>
            {safeImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={safeImageUrl}
                alt={slide.title ?? 'بانر المتجر'}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-[1200ms] ease-out',
                  active ? 'scale-100' : 'scale-105'
                )}
              />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,var(--surface-card,#fff),var(--surface-card-hover,#f8fafc))]" />
            )}

            <div
              className={cn(
                'absolute inset-0 bg-[linear-gradient(125deg,color-mix(in_oklab,var(--hero-overlay,#0f172a)_68%,transparent),transparent_62%)] transition-opacity duration-500',
                active ? 'opacity-100' : 'opacity-0'
              )}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.16)_100%)]" />

            {(slide.title || slide.subtitle || slide.buttonText) && (
              <div
                className={cn(
                  'absolute inset-0 flex flex-col items-start justify-end p-6 text-white transition-all duration-500 sm:p-8',
                  active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                )}
              >
                <div className="max-w-xl space-y-3">
                  {slide.title ? (
                    <h2 className="ds-heading text-2xl font-black md:text-4xl">
                      {slide.title}
                    </h2>
                  ) : null}
                  {slide.subtitle ? (
                    <p className="max-w-lg text-sm leading-7 text-white/82 md:text-base">
                      {slide.subtitle}
                    </p>
                  ) : null}
                  {slide.buttonText ? (
                    <span
                      className="inline-flex rounded-full px-5 py-2 text-sm font-semibold shadow-[var(--ds-shadow-sm)]"
                      style={{
                        backgroundColor: 'color-mix(in oklab, var(--ds-surface-elevated) 84%, white)',
                        color: 'var(--ds-text)',
                      }}
                    >
                      {slide.buttonText}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )

        return (
          <div
            key={slide.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-[700ms] ease-out',
              active ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
          >
            {slide.linkUrl ? (
              <Link href={toStoreAwareHref(slide.linkUrl, storeSlug)} className="block h-full w-full">
                {content}
              </Link>
            ) : (
              <div className="h-full w-full">{content}</div>
            )}
          </div>
        )
      })}

      {/* إظهار أدوات التنقل فقط إذا كان هناك أكثر من شريحة. */}
      {slides.length > 1 ? (
        <>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/18">
            <div
              className="h-full rounded-full bg-white transition-all duration-[5200ms] ease-linear"
              style={{ width: `${((current + 1) / slides.length) * 100}%` }}
            />
          </div>

          <div className="absolute inset-x-0 bottom-5 flex items-center justify-between px-4 sm:px-6">
            <div className="flex gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrent(index)}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    index === current ? 'w-8 bg-white' : 'w-2.5 bg-white/48 hover:bg-white/70'
                  )}
                  aria-label={`الانتقال إلى الشريحة ${index + 1}`}
                />
              ))}
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={previous}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur transition-colors hover:bg-white/28"
                aria-label="الشريحة السابقة"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur transition-colors hover:bg-white/28"
                aria-label="الشريحة التالية"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
