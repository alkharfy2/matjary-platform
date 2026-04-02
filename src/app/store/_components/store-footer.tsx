import Link from 'next/link'
import type { SocialLinks } from '@/db/schema'
import { storePath } from '@/lib/tenant/store-path'

type FooterPageLink = {
  id: string
  title: string
  slug: string
  pageType: string
}

type StoreFooterProps = {
  storeSlug: string
  storeName: string
  socialLinks: SocialLinks
  contactPhone: string | null
  contactEmail: string | null
  pages?: FooterPageLink[]
}

const socialLabels: Record<string, string> = {
  facebook: 'فيسبوك',
  instagram: 'انستجرام',
  twitter: 'تويتر',
  tiktok: 'تيك توك',
  youtube: 'يوتيوب',
  whatsapp: 'واتساب',
}

const footerPagePriority: Record<string, number> = {
  about: 1,
  terms: 2,
  privacy: 3,
  contact: 4,
  faq: 5,
  custom: 10,
  landing: 20,
}

export function StoreFooter({
  storeSlug,
  storeName,
  socialLinks,
  contactPhone,
  contactEmail,
  pages = [],
}: StoreFooterProps) {
  const activeSocials = Object.entries(socialLinks ?? {}).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && entry[1].trim().length > 0
  )

  const footerPages = [...pages]
    .filter((page) => page.slug && page.slug.trim().length > 0)
    .sort((a, b) => {
      const pa = footerPagePriority[a.pageType] ?? 99
      const pb = footerPagePriority[b.pageType] ?? 99
      if (pa !== pb) return pa - pb
      return a.title.localeCompare(b.title, 'ar')
    })

  return (
    <footer
      className="relative border-t"
      style={{ borderColor: 'var(--border-soft, #e5e7eb)', backgroundColor: 'var(--surface-muted, #f8fafc)' }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="surface-panel-elevated grid gap-6 p-6 md:grid-cols-[1.15fr_0.85fr_0.9fr]">
          <div className="space-y-3 text-center md:text-right">
            <h3 className="ds-heading text-2xl font-black text-[var(--ds-text)]">{storeName}</h3>
            <p className="text-sm leading-7 text-[var(--ds-text-muted)]">
              تجربة تسوق عصرية مبنية للثقة، مدعومة بواجهة بيع واضحة وسريعة على الجوال وسطح المكتب.
            </p>
          </div>

          <div className="space-y-3 text-center md:text-right">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">روابط مهمة</h4>
            {footerPages.length > 0 ? (
              <div className="flex flex-col gap-2 text-sm">
                {footerPages.map((page) => (
                  <Link
                    key={page.id}
                    href={storePath(`/page/${page.slug}`, { storeSlug })}
                    className="rounded-xl px-3 py-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
                  >
                    {page.title}
                  </Link>
                ))}
                <Link
                  href={storePath('/track', { storeSlug })}
                  className="rounded-xl px-3 py-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
                >
                  تتبع الطلب
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <Link
                  href={storePath('/track', { storeSlug })}
                  className="rounded-xl px-3 py-2 text-[var(--ds-text-muted)] transition-colors hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]"
                >
                  تتبع الطلب
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-3 text-center md:text-right">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">تواصل معنا</h4>

            {contactPhone || contactEmail ? (
              <div className="space-y-2 text-sm text-[var(--ds-text-muted)]">
                {contactPhone ? <p dir="ltr">{contactPhone}</p> : null}
                {contactEmail ? <p dir="ltr">{contactEmail}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--ds-text-soft)]">لا توجد بيانات تواصل حاليًا</p>
            )}

            {activeSocials.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                {activeSocials.map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-3 py-1.5 text-xs font-semibold text-[var(--ds-text-muted)] shadow-[var(--ds-shadow-sm)] transition-all hover:-translate-y-0.5 hover:text-[var(--ds-text)]"
                  >
                    {socialLabels[key] ?? key}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ds-divider)] pt-4 text-center">
          <p className="text-sm text-[var(--ds-text-muted)]">© {new Date().getFullYear()} {storeName}</p>
          <p className="text-xs text-[var(--ds-text-soft)]">
            مدعوم بواسطة{' '}
            <a
              href="https://matjary.com"
              className="font-semibold text-[var(--color-primary,#2563eb)] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              متجري
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
