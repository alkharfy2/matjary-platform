'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useCartStore } from '@/lib/stores/cart-store'
import { storePath } from '@/lib/tenant/store-path'
import { useStore } from '@/lib/tenant/store-context'
import { UpsellOffer } from './_components/upsell-offer'

export default function OrderSuccessPage() {
  const searchParams = useSearchParams()
  const store = useStore()
  const orderNumber = searchParams.get('order')
  const orderId = searchParams.get('oid')
  const clearCart = useCartStore((state) => state.clearCart)
  const cleared = useRef(false)

  useEffect(() => {
    if (!cleared.current) {
      cleared.current = true
      clearCart()
    }
  }, [clearCart])

  if (!orderNumber) {
    return (
      <div className="mx-auto flex min-h-[72vh] w-full max-w-[1280px] items-center justify-center px-4">
        <div className="ds-hero-panel max-w-lg px-6 py-10 text-center">
          <div
            className="mx-auto mb-4 inline-flex rounded-full p-4 shadow-[var(--ds-shadow-sm)]"
            style={{
              backgroundColor: 'color-mix(in oklab, var(--ds-warning) 14%, var(--ds-surface-elevated))',
              color: 'var(--ds-warning)',
            }}
          >
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="ds-heading text-3xl font-black text-[var(--ds-text)]">تعذر قراءة رقم الطلب</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
            يمكنك العودة إلى المتجر ومتابعة التسوق، وسيظل الطلب محفوظًا إذا تم إنشاؤه بنجاح.
          </p>
          <div className="mt-6">
            <Link
              href={storePath('/', { storeSlug: store.slug })}
              className="inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              العودة للمتجر
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[72vh] w-full max-w-[1280px] items-center justify-center px-4">
      <div className="ds-hero-panel max-w-xl px-6 py-10 text-center">
        <div
          className="mx-auto mb-4 inline-flex rounded-full p-4 shadow-[var(--ds-shadow-sm)]"
          style={{
            backgroundColor: 'color-mix(in oklab, var(--ds-success) 14%, var(--ds-surface-elevated))',
            color: 'var(--ds-success)',
          }}
        >
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ds-success)]">تم التأكيد</p>
        <h1 className="mt-3 ds-heading text-3xl font-black text-[var(--ds-text)]">تم تأكيد طلبك بنجاح</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
          شكرًا لك. سنراجع الطلب ونتواصل معك لتأكيد تفاصيل الشحن في أقرب وقت.
        </p>
        <p
          className="mt-5 rounded-full border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] px-4 py-2 text-lg font-bold text-[var(--ds-text)]"
          dir="ltr"
        >
          رقم الطلب: #{orderNumber}
        </p>
        {orderId && <UpsellOffer orderId={orderId} orderNumber={orderNumber} />}

        <div className="mt-6">
          <Link
            href={storePath('/', { storeSlug: store.slug })}
            className="inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            العودة للمتجر
          </Link>
        </div>
      </div>
    </div>
  )
}
