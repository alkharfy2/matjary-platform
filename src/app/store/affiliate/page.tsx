import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { notFound } from 'next/navigation'
import { storePath } from '@/lib/tenant/store-path'
import { AffiliateRegisterFormClient } from '@/app/store/affiliate/register-form'

export default async function AffiliatePage() {
  const store = await getCurrentStore()
  if (!store) notFound()

  const settings = (store.settings ?? {}) as Record<string, unknown>
  if (!settings.affiliateEnabled) notFound()

  const storeSlug = store.slug

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">اكسب عمولات مع {store.name}</h1>
        <p className="mt-2" style={{ color: 'var(--ds-text-muted)' }}>
          سجل كمسوق واحصل على رابط إحالة خاص بك. ستكسب عمولة على كل عملية شراء تتم من خلال رابطك.
        </p>
      </div>

      <div className="card-surface mt-8 rounded-lg border p-6" style={{ borderColor: 'var(--ds-border)' }}>
        <h2 className="mb-4 text-lg font-semibold">سجل كمسوق</h2>
        <AffiliateRegisterForm storeSlug={storeSlug} />
      </div>

      <div className="mt-6 text-center">
        <a
          href={storePath('/affiliate/dashboard', { storeSlug })}
          className="text-sm hover:underline"
          style={{ color: 'var(--ds-primary)' }}
        >
          لديك حساب بالفعل؟ اطلع على لوحة التحكم
        </a>
      </div>
    </div>
  )
}

function AffiliateRegisterForm({ storeSlug }: { storeSlug: string }) {
  return <AffiliateRegisterFormClient storeSlug={storeSlug} />
}
