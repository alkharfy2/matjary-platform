'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { useStore } from '@/lib/tenant/store-context'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'
import { TrustBadges } from '@/app/store/_components/trust-badges'

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const store = useStore()
  const currency = store.settings.currency ?? 'EGP'

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6">
        <div className="ds-hero-panel mx-auto max-w-xl px-6 py-14 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft,#eff6ff)] text-[var(--color-primary,#000)] shadow-[var(--ds-shadow-sm)]">
            <ShoppingBag className="h-9 w-9" />
          </div>
          <h1 className="ds-heading text-3xl font-black text-[var(--ds-text)] md:text-4xl">سلة التسوق فارغة</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
            لم تُضف أي منتجات بعد. استكشف المتجر واختر ما يناسبك، وسنحتفظ لك بالتجربة بشكل واضح وسلس.
          </p>
          <div className="mt-6">
            <Link
              href={storePath('/', { storeSlug: store.slug })}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              ابدأ التسوق
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ds-text-soft)]">سلة التسوق</p>
          <h1 className="mt-2 ds-heading text-3xl font-black text-[var(--ds-text)]">راجع مشترياتك قبل إتمام الطلب</h1>
        </div>
        <span className="rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-4 py-2 text-sm font-semibold text-[var(--ds-text-muted)] shadow-[var(--ds-shadow-sm)]">
          {itemCount} عنصر
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => {
            const maxQuantity =
              typeof item.maxQuantity === 'number' && Number.isFinite(item.maxQuantity)
                ? Math.max(1, Math.floor(item.maxQuantity))
                : null
            const reachedStockLimit = maxQuantity !== null && item.quantity >= maxQuantity
            const lineTotal = item.unitPrice * item.quantity

            return (
              <div
                key={`${item.productId}-${item.variantId ?? 'default'}`}
                className="surface-panel-elevated flex flex-col gap-4 rounded-[28px] p-4 sm:flex-row sm:items-center"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[22px] bg-[var(--surface-card,#fff)]">
                  {item.productImage ? (
                    <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="96px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[var(--ds-text-muted)]/80">
                      <ShoppingBag className="h-7 w-7" />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[var(--ds-text)] sm:text-lg">{item.productName}</h2>
                      {item.variantLabel ? (
                        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">{item.variantLabel}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
                        {formatPrice(item.unitPrice, currency)} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-lg font-black text-[var(--ds-text)]">{formatPrice(lineTotal, currency)}</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center overflow-hidden rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-sm)]">
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        className="flex h-11 w-11 items-center justify-center text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-surface-muted)]"
                        aria-label="تقليل الكمية"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="flex h-11 min-w-[3rem] items-center justify-center border-x border-[var(--ds-border)] text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          if (reachedStockLimit) return
                          updateQuantity(item.productId, item.variantId, item.quantity + 1)
                        }}
                        disabled={reachedStockLimit}
                        className="flex h-11 w-11 items-center justify-center text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-surface-muted)] disabled:cursor-not-allowed disabled:text-[var(--ds-text-soft)]"
                        aria-label="زيادة الكمية"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {reachedStockLimit ? (
                        <span className="text-xs font-semibold text-[var(--ds-warning)]">وصلت للحد الأقصى من المخزون</span>
                      ) : null}

                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold transition-all hover:-translate-y-0.5"
                        style={{
                          backgroundColor: 'color-mix(in oklab, var(--ds-danger) 12%, var(--ds-surface-elevated))',
                          color: 'var(--ds-danger)',
                        }}
                        aria-label={`حذف ${item.productName} من السلة`}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="h-fit lg:sticky lg:top-24">
          <div className="surface-panel-elevated rounded-[28px] p-6">
            <h2 className="ds-heading text-2xl font-black text-[var(--ds-text)]">ملخص الطلب</h2>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ds-text-muted)]">المجموع الفرعي</span>
                <span className="font-medium text-[var(--ds-text)]">{formatPrice(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ds-text-muted)]">الشحن</span>
                <span className="text-[var(--ds-text-muted)]">يُحسب عند إتمام الطلب</span>
              </div>
              <hr className="border-[var(--ds-border)]" />
              <div className="flex justify-between text-base font-bold">
                <span>الإجمالي</span>
                <span style={{ color: 'var(--color-primary, #000)' }}>{formatPrice(subtotal, currency)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={storePath('/checkout', { storeSlug: store.slug })}
                className="flex w-full items-center justify-center rounded-full py-3.5 text-base font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
                style={{ backgroundColor: 'var(--color-primary, #000)' }}
              >
                إتمام الطلب
              </Link>

              <Link
                href={storePath('/', { storeSlug: store.slug })}
                className="flex w-full items-center justify-center rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] py-3 text-sm font-semibold text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)]"
              >
                الاستمرار في التسوق
              </Link>
            </div>

            <TrustBadges className="mt-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
