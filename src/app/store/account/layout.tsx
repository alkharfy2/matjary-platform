'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import {
  User,
  ShoppingBag,
  MapPin,
  Heart,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react'

type CustomerInfo = {
  id: string
  name: string
  phone: string
  email: string | null
}

const NAV_ITEMS = [
  { href: '/account', label: 'حسابي', icon: User },
  { href: '/account/orders', label: 'طلباتي', icon: ShoppingBag },
  { href: '/account/addresses', label: 'عناويني', icon: MapPin },
  { href: '/account/wishlist', label: 'المفضلة', icon: Heart },
  { href: '/account/settings', label: 'الإعدادات', icon: Settings },
]

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const store = useStore()
  const pathname = usePathname()
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function checkAuth() {
      try {
        const res = await fetch('/api/storefront/auth/me')
        const data = await res.json()
        if (cancelled) return

        if (data?.success && data.data?.customer) {
          setCustomer(data.data.customer)
        } else {
          const loginPath = storePath('/account/login', { storeSlug: store.slug })
          if (!pathname.includes('/login')) {
            router.replace(loginPath)
          }
        }
      } catch {
        if (!cancelled) {
          const loginPath = storePath('/account/login', { storeSlug: store.slug })
          if (!pathname.includes('/login')) {
            router.replace(loginPath)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (pathname.includes('/login')) {
      setLoading(false)
      return
    }

    void checkAuth()
    return () => { cancelled = true }
  }, [pathname, router, store.slug])

  async function handleLogout() {
    await fetch('/api/storefront/auth/logout', { method: 'POST' })
    router.replace(storePath('/', { storeSlug: store.slug }))
  }

  if (pathname.includes('/login')) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary,#000)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={storePath('/', { storeSlug: store.slug })}
          className="inline-flex items-center gap-1 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          العودة للمتجر
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="surface-panel-elevated rounded-[28px] p-4">
          {customer && (
            <div className="mb-4 border-b border-[var(--ds-border)] pb-4">
              <p className="text-base font-bold text-[var(--ds-text)]">{customer.name}</p>
              <p className="text-sm text-[var(--ds-text-muted)]" dir="ltr">{customer.phone}</p>
            </div>
          )}

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const fullHref = storePath(item.href as `/${string}`, { storeSlug: store.slug })
              const isActive = pathname === fullHref ||
                (item.href !== '/account' && pathname.startsWith(fullHref))

              return (
                <Link
                  key={item.href}
                  href={fullHref}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary,#000)] text-white shadow-[var(--button-glow)]'
                      : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--ds-danger)] hover:bg-[var(--ds-hover)] transition-all"
            >
              <LogOut className="h-5 w-5" />
              تسجيل الخروج
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
