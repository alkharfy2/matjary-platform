'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Check, Minus, Plus, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/stores/cart-store'
import { useStore } from '@/lib/tenant/store-context'
import { formatPrice } from '@/lib/utils'
import { TrustBadges } from '@/app/store/_components/trust-badges'
import { CartToast } from '@/app/store/_components/cart-toast'
import { MobileStickyCart } from './mobile-sticky-cart'
import { storePath } from '@/lib/tenant/store-path'
import type { ProductVariant } from '@/db/schema'

export type ProductDetailsProps = {
  productId: string
  name: string
  slug: string
  price: string
  compareAtPrice: string | null
  images: string[]
  stock: number
  variants: ProductVariant[]
  currency: string
  description: string | null
}

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock'
type CartButtonState = 'idle' | 'loading' | 'success'

type VariantOptionGroup = {
  name: string
  values: string[]
}

function getStockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out-of-stock'
  if (stock <= 5) return 'low-stock'
  return 'in-stock'
}

function StockBadge({ stock }: { stock: number }) {
  const status = getStockStatus(stock)
  const config: Record<StockStatus, { label: string; className: string }> = {
    'in-stock': {
      label: 'متوفر الآن',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    'low-stock': {
      label: `المتبقي ${stock} فقط`,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    'out-of-stock': {
      label: 'غير متوفر حاليا',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    },
  }

  const { label, className } = config[status]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-[var(--ds-shadow-sm)] ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label}
    </span>
  )
}

function getVariantOptionValue(variant: ProductVariant, optionName: string): string | null {
  const match = variant.options.find((option) => option.name?.trim() === optionName)
  const value = match?.value?.trim() ?? ''

  return value || null
}

function buildVariantOptionGroups(variants: ProductVariant[]): VariantOptionGroup[] {
  const groups = new Map<string, Set<string>>()

  for (const variant of variants) {
    for (const option of variant.options) {
      const optionName = option.name?.trim() ?? ''
      const optionValue = option.value?.trim() ?? ''

      if (!optionName || !optionValue) continue

      if (!groups.has(optionName)) {
        groups.set(optionName, new Set())
      }

      groups.get(optionName)?.add(optionValue)
    }
  }

  return Array.from(groups.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }))
}

function getInitialSelectedOptions(
  variants: ProductVariant[],
  groups: VariantOptionGroup[]
): Record<string, string> {
  const seedVariant = variants.find((variant) => variant.stock > 0) ?? variants[0]
  const selections: Record<string, string> = {}

  for (const group of groups) {
    const seededValue = seedVariant ? getVariantOptionValue(seedVariant, group.name) : null
    selections[group.name] =
      seededValue && group.values.includes(seededValue) ? seededValue : (group.values[0] ?? '')
  }

  return selections
}

function resolveSelectedVariant(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>,
  groups: VariantOptionGroup[]
): ProductVariant | null {
  if (!groups.length) {
    return variants[0] ?? null
  }

  const hasCompleteSelections = groups.every((group) => Boolean(selectedOptions[group.name]))
  if (!hasCompleteSelections) {
    return null
  }

  return (
    variants.find((variant) =>
      groups.every(
        (group) => getVariantOptionValue(variant, group.name) === selectedOptions[group.name]
      )
    ) ?? null
  )
}

function isOptionValueAvailable(
  variants: ProductVariant[],
  selectedOptions: Record<string, string>,
  groups: VariantOptionGroup[],
  optionName: string,
  optionValue: string
): boolean {
  return variants.some((variant) => {
    if (variant.stock <= 0) return false
    if (getVariantOptionValue(variant, optionName) !== optionValue) return false

    return groups.every((group) => {
      if (group.name === optionName) return true

      const selectedValue = selectedOptions[group.name]
      if (!selectedValue) return true

      return getVariantOptionValue(variant, group.name) === selectedValue
    })
  })
}

export function ProductDetails({
  productId,
  name,
  price,
  compareAtPrice,
  images,
  stock,
  variants,
  currency,
  description,
}: ProductDetailsProps) {
  const router = useRouter()
  const store = useStore()
  const addItem = useCartStore((state) => state.addItem)
  const setStoreId = useCartStore((state) => state.setStoreId)

  const activeVariants = variants.filter((variant) => variant.isActive ?? true)
  const variantGroups = buildVariantOptionGroups(activeVariants)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() =>
    getInitialSelectedOptions(activeVariants, variantGroups)
  )
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [cartState, setCartState] = useState<CartButtonState>('idle')
  const [toastOpen, setToastOpen] = useState(false)

  const hasVariantGroups = variantGroups.length > 0
  const hasCompleteVariantSelection =
    !hasVariantGroups || variantGroups.every((group) => Boolean(selectedOptions[group.name]))
  const selectedVariant = resolveSelectedVariant(activeVariants, selectedOptions, variantGroups)
  const basePrice = Number(price)
  const baseCompareAtPrice = compareAtPrice ? Number(compareAtPrice) : null
  const effectivePrice = selectedVariant
    ? selectedVariant.price ?? basePrice
    : hasVariantGroups
      ? null
      : basePrice
  const effectiveCompare = selectedVariant
    ? selectedVariant.compareAtPrice ?? baseCompareAtPrice
    : hasVariantGroups
      ? null
      : baseCompareAtPrice
  const effectiveStock = selectedVariant ? selectedVariant.stock : hasVariantGroups ? 0 : stock
  const variantSelectionRequired = hasVariantGroups && !hasCompleteVariantSelection
  const variantCombinationUnavailable =
    hasVariantGroups && hasCompleteVariantSelection && !selectedVariant
  const outOfStock = effectiveStock <= 0
  const purchaseBlocked =
    variantSelectionRequired || variantCombinationUnavailable || effectivePrice === null || outOfStock
  const hasDiscount =
    effectivePrice !== null &&
    effectiveCompare !== null &&
    effectiveCompare > effectivePrice
  const currentImage = images[selectedImage] ?? null
  const variantLabel = selectedVariant
    ? selectedVariant.options
        .map((option) => `${option.name}: ${option.value}`)
        .join('، ')
    : null

  const handleOptionChange = useCallback(
    (groupName: string, optionValue: string) => {
      setSelectedOptions((current) => {
        const nextSelections = {
          ...current,
          [groupName]: optionValue,
        }

        for (const group of variantGroups) {
          const selectedValue = nextSelections[group.name]
          if (!selectedValue) continue

          const stillAvailable = isOptionValueAvailable(
            activeVariants,
            nextSelections,
            variantGroups,
            group.name,
            selectedValue
          )

          if (!stillAvailable) {
            nextSelections[group.name] = ''
          }
        }

        return nextSelections
      })

      setQuantity(1)
    },
    [activeVariants, variantGroups]
  )

  const handleAddToCart = useCallback(() => {
    if (
      cartState !== 'idle' ||
      purchaseBlocked ||
      effectivePrice === null ||
      (hasVariantGroups && !selectedVariant)
    ) {
      return
    }

    setCartState('loading')

    window.setTimeout(() => {
      setStoreId(store.id)
      addItem({
        productId,
        productName: name,
        productImage: images[0] ?? null,
        variantId: selectedVariant?.id ?? null,
        variantLabel,
        quantity,
        maxQuantity: effectiveStock,
        unitPrice: effectivePrice,
      })
      setCartState('success')
      setToastOpen(true)
      window.setTimeout(() => setToastOpen(false), 2500)
      window.setTimeout(() => setCartState('idle'), 2000)
    }, 280)
  }, [
    addItem,
    cartState,
    effectivePrice,
    effectiveStock,
    hasVariantGroups,
    images,
    name,
    productId,
    purchaseBlocked,
    quantity,
    selectedVariant,
    setStoreId,
    store.id,
    variantLabel,
  ])

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr]">
      <div className="space-y-4">
        <div className="surface-panel-elevated overflow-hidden rounded-[30px] p-3">
          <div className="relative aspect-[4/4.8] overflow-hidden rounded-[24px] bg-[var(--surface-card,#fff)]">
            {currentImage ? (
              <Image
                src={currentImage}
                alt={name}
                fill
                className="object-cover transition-transform duration-[900ms] ease-out hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                <Sparkles className="h-12 w-12" />
                <span className="text-sm">لا توجد صورة</span>
              </div>
            )}

            {hasDiscount ? (
              <span
                className="absolute start-4 top-4 rounded-full px-3 py-1 text-xs font-bold text-white shadow-[var(--ds-shadow-sm)]"
                style={{ backgroundColor: 'var(--color-accent, #ef4444)' }}
              >
                خصم
              </span>
            ) : null}
          </div>
        </div>

        {images.length > 1 ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {images.map((image, index) => (
              <button
                key={image + index}
                onClick={() => setSelectedImage(index)}
                className={`group relative aspect-square overflow-hidden rounded-[20px] border-2 bg-[var(--surface-card,var(--ds-surface-elevated))] shadow-[var(--ds-shadow-sm)] transition-all ${
                  index === selectedImage
                    ? 'border-[var(--color-primary,#000)] ring-4 ring-[color:color-mix(in_oklab,var(--color-primary,#000)_16%,var(--ds-surface-elevated))]'
                    : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <Image
                  src={image}
                  alt={`${name} - ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <div className="surface-panel-elevated space-y-6 rounded-[30px] p-6 sm:p-7">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {variantSelectionRequired ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-[var(--ds-shadow-sm)]">
                  اختر التركيبة
                </span>
              ) : variantCombinationUnavailable ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 shadow-[var(--ds-shadow-sm)]">
                  تركيبة غير متاحة
                </span>
              ) : (
                <StockBadge stock={effectiveStock} />
              )}

              {hasDiscount ? (
                <span className="rounded-full bg-[var(--accent-soft,#eff6ff)] px-3 py-1 text-xs font-semibold text-[var(--color-accent,#ef4444)] shadow-[var(--ds-shadow-sm)]">
                  عرض حالي
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="ds-heading text-3xl font-black leading-tight text-[var(--ds-text)] md:text-5xl">
                {name}
              </h1>
              {description ? (
                <p className="text-sm leading-8 text-[var(--ds-text-muted)] md:text-base">{description}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {effectivePrice !== null ? (
                <span
                  className="text-3xl font-black md:text-4xl"
                  style={{ color: 'var(--color-primary, #000)' }}
                >
                  {formatPrice(effectivePrice, currency)}
                </span>
              ) : (
                <span className="text-base font-semibold text-[var(--ds-text-muted)] md:text-lg">
                  اختر الخيارات لعرض السعر
                </span>
              )}

              {hasDiscount && effectiveCompare !== null ? (
                <span className="text-sm text-[var(--ds-text-soft)] line-through">
                  {formatPrice(effectiveCompare, currency)}
                </span>
              ) : null}
            </div>
          </div>

          {variantGroups.length > 0 ? (
            <div className="space-y-4">
              {variantGroups.map((group) => (
                <div key={group.name} className="space-y-3">
                  <p className="text-xs font-semibold text-[var(--ds-text-soft)]">{group.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => {
                      const isSelected = selectedOptions[group.name] === value
                      const isDisabled = !isOptionValueAvailable(
                        activeVariants,
                        selectedOptions,
                        variantGroups,
                        group.name,
                        value
                      )
                      const isInvalidSelected = isSelected && isDisabled

                      return (
                        <button
                          key={`${group.name}-${value}`}
                          onClick={() => handleOptionChange(group.name, value)}
                          disabled={isDisabled && !isSelected}
                          className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all ${
                            isInvalidSelected
                              ? 'border-amber-300 bg-amber-50 text-amber-800'
                              : isSelected
                                ? 'border-[var(--color-primary,#000)] bg-[var(--color-primary,#000)] text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]'
                                : isDisabled
                                  ? 'cursor-not-allowed border-[var(--ds-divider)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-soft)] line-through'
                                  : 'border-[var(--ds-border)] bg-[var(--ds-surface-glass)] text-[var(--ds-text-muted)] hover:-translate-y-0.5 hover:border-[var(--border-strong,#d1d5db)] hover:text-[var(--ds-text)]'
                          }`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">
                الكمية
              </p>
              <div className="inline-flex items-center overflow-hidden rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-sm)]">
                <button
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={purchaseBlocked || quantity <= 1}
                  className="flex h-12 w-12 items-center justify-center text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:text-[var(--ds-text-soft)]"
                  aria-label="تقليل الكمية"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex h-12 min-w-[3.75rem] items-center justify-center border-x border-[var(--ds-border)] text-center font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((current) =>
                      effectiveStock > 0 ? Math.min(effectiveStock, current + 1) : current
                    )
                  }
                  disabled={purchaseBlocked || quantity >= effectiveStock}
                  className="flex h-12 w-12 items-center justify-center text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)] disabled:cursor-not-allowed disabled:text-[var(--ds-text-soft)]"
                  aria-label="زيادة الكمية"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--ds-border)] bg-[var(--surface-card,#fff)] px-4 py-3 text-sm text-[var(--ds-text-muted)] shadow-[var(--ds-shadow-sm)]">
              {variantSelectionRequired
                ? 'اختر قيمة من كل متغير لإظهار السعر والتوفر.'
                : variantCombinationUnavailable
                  ? 'هذه التركيبة غير متاحة حاليا. اختر قيما أخرى.'
                  : outOfStock
                    ? 'هذا المنتج غير متوفر الآن.'
                    : `يمكنك إضافة حتى ${effectiveStock} قطعة من هذا الاختيار.`}
            </div>
          </div>

          <div className="pt-2">
            {purchaseBlocked ? (
              <div
                id="add-to-cart-btn"
                className="flex items-center justify-center gap-2 rounded-[20px] bg-[var(--ds-surface-muted)] py-4 font-medium text-[var(--ds-text-muted)]"
              >
                {variantSelectionRequired
                  ? 'اختر التركيبة أولا'
                  : variantCombinationUnavailable
                    ? 'هذه التركيبة غير متاحة'
                    : 'غير متوفر حاليا'}
              </div>
            ) : (
              <button
                id="add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={cartState !== 'idle'}
                className={`flex w-full items-center justify-center gap-2 rounded-[22px] py-4 text-base font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                  cartState === 'success'
                    ? 'bg-[var(--ds-success)]'
                    : cartState === 'loading'
                      ? 'opacity-80'
                      : 'hover:-translate-y-0.5 hover:opacity-95'
                }`}
                style={{
                  backgroundColor:
                    cartState === 'success' ? undefined : 'var(--color-primary, #000)',
                }}
              >
                {cartState === 'loading' ? (
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : cartState === 'success' ? (
                  <Check className="h-5 w-5" />
                ) : null}

                {cartState === 'loading'
                  ? 'جاري الإضافة...'
                  : cartState === 'success'
                    ? 'تمت الإضافة إلى السلة'
                    : 'أضف إلى السلة'}
              </button>
            )}
          </div>
        </div>
        <TrustBadges className="mt-2" />
      </div>

      <MobileStickyCart
        price={effectivePrice}
        compareAtPrice={effectiveCompare}
        currency={currency}
        onAddToCart={handleAddToCart}
        disabled={purchaseBlocked || cartState !== 'idle'}
        loading={cartState === 'loading'}
      />

      <CartToast
        open={toastOpen}
        message="تمت إضافة المنتج إلى السلة بنجاح"
        actionLabel="عرض السلة"
        onAction={() => router.push(storePath('/cart', { storeSlug: store.slug }))}
        onClose={() => setToastOpen(false)}
      />
    </div>
  )
}
