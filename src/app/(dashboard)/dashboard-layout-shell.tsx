'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Menu,
  X,
  Store,
  ExternalLink,
  LayoutDashboard,
  FolderTree,
  Package,
  ShoppingCart,
  Users,
  TicketPercent,
  Truck,
  FileText,
  Palette,
  ChartNoAxesCombined,
  Settings,
  Wallet,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme'
import { SubscriptionBanner } from './subscription-banner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DashboardSidebarIcon =
  | 'dashboard'
  | 'categories'
  | 'products'
  | 'orders'
  | 'wallet'
  | 'customers'
  | 'coupons'
  | 'shipping'
  | 'pages'
  | 'design'
  | 'analytics'
  | 'settings'

export type DashboardSidebarItem = {
  href: string
  label: string
  icon: DashboardSidebarIcon
}

type DashboardLayoutShellProps = {
  storeName: string
  storeSlug: string
  storefrontHref: string
  isPaid: boolean
  storeId: string
  sidebarItems: DashboardSidebarItem[]
  children: ReactNode
}

const iconMap: Record<DashboardSidebarIcon, ReactNode> = {
  dashboard: <LayoutDashboard className="h-4 w-4" />,
  categories: <FolderTree className="h-4 w-4" />,
  products: <Package className="h-4 w-4" />,
  orders: <ShoppingCart className="h-4 w-4" />,
  wallet: <Wallet className="h-4 w-4" />,
  customers: <Users className="h-4 w-4" />,
  coupons: <TicketPercent className="h-4 w-4" />,
  shipping: <Truck className="h-4 w-4" />,
  pages: <FileText className="h-4 w-4" />,
  design: <Palette className="h-4 w-4" />,
  analytics: <ChartNoAxesCombined className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
}

function isItemActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

function SidebarContent({
  pathname,
  sidebarItems,
  onNavigate,
}: {
  pathname: string
  sidebarItems: DashboardSidebarItem[]
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-1.5 p-2">
      {sidebarItems.map((item) => {
        const active = isItemActive(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-[var(--ds-radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--ds-motion-fast)]',
              active
                ? 'bg-[var(--ds-primary)] text-[var(--ds-primary-contrast)] shadow-[var(--ds-shadow-sm)]'
                : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]'
            )}
          >
            <span className="inline-flex h-4 w-4 items-center justify-center">{iconMap[item.icon]}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardLayoutShell({
  storeName,
  storeSlug,
  storefrontHref,
  isPaid,
  storeId,
  sidebarItems,
  children,
}: DashboardLayoutShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen app-shell-gradient lg:flex">
      <aside className="hidden w-72 shrink-0 border-e border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] backdrop-blur-xl lg:flex lg:flex-col">
        <div className="border-b border-[var(--ds-divider)] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[var(--ds-primary-soft)] p-2.5 text-[var(--ds-primary)] shadow-[var(--ds-glow-primary)]">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-[var(--ds-text)]">{storeName}</h1>
              <p className="mt-1 truncate text-xs text-[var(--ds-text-muted)]" dir="ltr">
                {storeSlug}.matjary.com
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <SidebarContent pathname={pathname} sidebarItems={sidebarItems} />
        </div>
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-[var(--ds-overlay)] transition-opacity duration-[var(--ds-motion-fast)] lg:hidden',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-80 border-s border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] shadow-[var(--ds-shadow-lg)] transition-transform duration-[var(--ds-motion-base)] lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        {...(!mobileMenuOpen ? { inert: true } : {})}
      >
        <div className="border-b border-[var(--ds-divider)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--ds-text)]">{storeName}</h2>
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]" dir="ltr">
                {storeSlug}.matjary.com
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق القائمة">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <ThemeToggle className="w-full justify-center" />
        </div>
        <SidebarContent
          pathname={pathname}
          sidebarItems={sidebarItems}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                variant="secondary"
                size="icon"
                className="lg:hidden"
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ds-text-soft)]">Dashboard</p>
                <h2 className="ds-heading text-lg font-semibold text-[var(--ds-text)] sm:text-xl">لوحة التحكم</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <a href={storefrontHref} target="_blank" rel="noopener noreferrer">
                <Button size="sm" glow className="gap-1.5">
                  عرض المتجر
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>
        </header>

        {!isPaid ? <SubscriptionBanner storeId={storeId} /> : null}

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
