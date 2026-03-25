'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Users, Gem } from 'lucide-react'
import { cn } from '@/lib/utils'

type SuperAdminNavProps = {
  className?: string
  onNavigate?: () => void
}

const sidebarItems = [
  { href: '/super-admin', label: 'نظرة عامة', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/super-admin/stores', label: 'المتاجر', icon: <Store className="h-4 w-4" /> },
  { href: '/super-admin/merchants', label: 'التجار', icon: <Users className="h-4 w-4" /> },
  { href: '/super-admin/plans', label: 'الخطط', icon: <Gem className="h-4 w-4" /> },
]

export function SuperAdminNav({ className = 'p-2', onNavigate }: SuperAdminNavProps) {
  const pathname = usePathname()

  return (
    <nav className={className}>
      {sidebarItems.map((item) => {
        const isActive =
          item.href === '/super-admin'
            ? pathname === '/super-admin'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-[var(--ds-radius-md)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--ds-motion-fast)]',
              isActive
                ? 'bg-[var(--ds-primary)] text-[var(--ds-primary-contrast)] shadow-[var(--ds-shadow-sm)]'
                : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-hover)] hover:text-[var(--ds-text)]'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
