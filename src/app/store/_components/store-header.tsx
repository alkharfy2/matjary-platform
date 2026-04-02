import Link from 'next/link'
import { ShoppingBag, Sparkles, User } from 'lucide-react'
import { ThemeToggle } from '@/components/theme'
import { CartCounter } from './cart-counter'
import { StoreSearch } from './store-search'
import { storePath } from '@/lib/tenant/store-path'
import { buildCategorySlugSegment } from '@/lib/categories/category-slug'
import { LanguageSwitcher } from './language-switcher'

type CategoryLink = {
  id: string
  name: string
  slug: string
}

type StoreHeaderProps = {
  storeSlug: string
  storeName: string
  logoUrl?: string | null
  categories: CategoryLink[]
  currency?: string
  blogEnabled?: boolean
  supportedLanguages?: string[]
}

export function StoreHeader({
  storeSlug,
  storeName,
  logoUrl,
  categories,
  currency,
  blogEnabled,
  supportedLanguages,
}: StoreHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 border-b bg-[var(--header-bg,#fff)]/88 backdrop-blur-xl"
      style={{
        borderColor: 'var(--border-soft, #e5e7eb)',
        boxShadow: 'var(--header-shadow, 0 12px 26px rgba(15,23,42,0.08))',
      }}
    >
      <div className="mx-auto flex min-h-[4.75rem] w-full max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={storePath('/', { storeSlug })}
          className="flex min-w-0 items-center gap-3 text-base font-bold sm:text-xl"
          style={{ color: 'var(--header-brand, #111827)' }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`شعار ${storeName}`}
              className="h-11 w-11 shrink-0 rounded-2xl border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] object-contain shadow-[var(--ds-shadow-sm)]"
            />
          ) : (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-primary,#000),color-mix(in_oklab,var(--color-primary,#000)_72%,var(--color-accent,#3b82f6)))] text-[var(--color-primary-contrast,#fff)] shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]">
              <ShoppingBag className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <span className="block truncate ds-heading">{storeName}</span>
            <span className="hidden text-xs font-medium text-[var(--header-link,#6b7280)] sm:block">
              واجهة بيع مصممة للثقة والتحويل
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href={storePath('/', { storeSlug })}
            className="rounded-full px-3 py-2 text-sm font-medium transition-all hover:bg-[var(--ds-hover)]"
            style={{ color: 'var(--header-link, #374151)' }}
          >
            الرئيسية
          </Link>
          {categories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              href={storePath(`/category/${buildCategorySlugSegment(cat.id, cat.slug)}`, {
                storeSlug,
              })}
              className="rounded-full px-3 py-2 text-sm font-medium transition-all hover:bg-[var(--ds-hover)]"
              style={{ color: 'var(--header-link, #374151)' }}
            >
              {cat.name}
            </Link>
          ))}
          {blogEnabled ? (
            <Link
              href={storePath('/blog', { storeSlug })}
              className="rounded-full px-3 py-2 text-sm font-medium transition-all hover:bg-[var(--ds-hover)]"
              style={{ color: 'var(--header-link, #374151)' }}
            >
              المدونة
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {supportedLanguages && supportedLanguages.length > 1 && (
            <LanguageSwitcher supportedLanguages={supportedLanguages} />
          )}
          <ThemeToggle compact className="hidden sm:inline-flex" />
          <Link
            href={storePath('/account', { storeSlug })}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] text-[var(--header-link,#374151)] shadow-[var(--ds-shadow-sm)] transition-all hover:bg-[var(--ds-hover)]"
            aria-label="حسابي"
          >
            <User className="h-5 w-5" />
          </Link>
          <StoreSearch
            storeSlug={storeSlug}
            currency={currency}
            className="hidden w-56 md:block lg:w-72"
          />
          <CartCounter storeSlug={storeSlug} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] space-y-3 border-t border-[var(--border-soft,#e5e7eb)] px-4 py-3 md:hidden sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <StoreSearch storeSlug={storeSlug} currency={currency} />
          </div>
          <ThemeToggle compact />
        </div>
        {categories.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link
              href={storePath('/', { storeSlug })}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] px-3 py-1.5 text-xs font-semibold text-[var(--header-link,#374151)] shadow-[var(--ds-shadow-sm)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              الرئيسية
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={storePath(`/category/${buildCategorySlugSegment(cat.id, cat.slug)}`, {
                  storeSlug,
                })}
                className="whitespace-nowrap rounded-full border border-[var(--border-soft,#e5e7eb)] bg-[var(--surface-card,#fff)] px-3 py-1.5 text-xs font-medium text-[var(--header-link,#374151)] shadow-[var(--ds-shadow-sm)]"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}
