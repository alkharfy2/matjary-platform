import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { buildTenantStorefrontHref } from '@/lib/tenant/urls'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import {
  DashboardLayoutShell,
  type DashboardSidebarItem,
} from './dashboard-layout-shell'
import { OrderNotificationListener } from '@/components/dashboard/order-notification-listener'

const sidebarItems: DashboardSidebarItem[] = [
  { href: '/dashboard', label: 'نظرة عامة', icon: 'dashboard' },
  { href: '/dashboard/categories', label: 'التصنيفات', icon: 'categories' },
  { href: '/dashboard/products', label: 'المنتجات', icon: 'products' },
  { href: '/dashboard/orders', label: 'الطلبات', icon: 'orders' },
  { href: '/dashboard/wallet', label: 'المحفظة', icon: 'wallet' },
  { href: '/dashboard/customers', label: 'العملاء', icon: 'customers' },
  { href: '/dashboard/coupons', label: 'الكوبونات', icon: 'coupons' },
  { href: '/dashboard/shipping', label: 'مناطق الشحن', icon: 'shipping' },
  { href: '/dashboard/pages', label: 'الصفحات', icon: 'pages' },
  { href: '/dashboard/design', label: 'التصميم', icon: 'design' },
  { href: '/dashboard/analytics', label: 'التقارير', icon: 'analytics' },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: 'settings' },
]

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard' })

  if (access.status === 'unauthenticated') {
    redirect('/auth/sign-in?redirect_url=%2Fdashboard')
  }

  if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
    redirect('/forbidden?scope=dashboard-store')
  }

  const { store } = access
  const storefrontHref = buildTenantStorefrontHref(store.slug)

  return (
    <DashboardLayoutShell
      storeName={store.name}
      storeSlug={store.slug}
      storefrontHref={storefrontHref}
      isPaid={store.isPaid}
      storeId={store.id}
      sidebarItems={sidebarItems}
    >
      {children}
      <OrderNotificationListener />
    </DashboardLayoutShell>
  )
}

