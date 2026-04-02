'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import { ShoppingBag, MapPin, Heart, Settings } from 'lucide-react'

type CustomerInfo = {
  id: string
  name: string
  phone: string
  email: string | null
}

const QUICK_LINKS = [
  { href: '/account/orders', label: 'طلباتي', icon: ShoppingBag, desc: 'تتبع طلباتك وحالة الشحن' },
  { href: '/account/addresses', label: 'عناويني', icon: MapPin, desc: 'إدارة عناوين التوصيل' },
  { href: '/account/wishlist', label: 'المفضلة', icon: Heart, desc: 'المنتجات التي أعجبتك' },
  { href: '/account/settings', label: 'الإعدادات', icon: Settings, desc: 'تعديل بياناتك الشخصية' },
]

export default function AccountPage() {
  const store = useStore()
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/storefront/auth/me')
        const data = await res.json()
        if (!cancelled && data?.success) setCustomer(data.data?.customer)
      } catch { /* handled by layout */ }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-6">
      <div className="surface-panel-elevated rounded-[28px] p-6">
        <h1 className="ds-heading text-2xl font-black text-[var(--ds-text)]">
          مرحباً{customer?.name ? ` ${customer.name}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-[var(--ds-text-muted)]">
          من هنا يمكنك إدارة حسابك وطلباتك وعناوينك
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={storePath(link.href as `/${string}`, { storeSlug: store.slug })}
            className="surface-panel-elevated group flex items-center gap-4 rounded-[24px] p-5 transition-all hover:-translate-y-1 hover:shadow-[var(--ds-shadow-lg)]"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--button-glow)]"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              <link.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-[var(--ds-text)]">{link.label}</p>
              <p className="text-xs text-[var(--ds-text-muted)]">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
