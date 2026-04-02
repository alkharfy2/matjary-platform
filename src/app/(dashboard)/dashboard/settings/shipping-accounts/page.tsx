import { db } from '@/db'
import { storeShippingAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const PROVIDERS = [
  { id: 'bosta' as const, name: 'Bosta', description: 'أشهر شركة شحن في مصر' },
  { id: 'aramex' as const, name: 'Aramex', description: 'شحن محلي ودولي' },
  { id: 'jnt' as const, name: 'J&T Express', description: 'شحن سريع بأسعار منافسة' },
  { id: 'mylerz' as const, name: 'Mylerz', description: 'شحن وتوصيل في مصر' },
]

const accountSchema = z.object({
  provider: z.enum(['bosta', 'aramex', 'jnt', 'mylerz']),
  apiKey: z.string().min(1, { error: 'API Key مطلوب' }),
  apiSecret: z.string().optional(),
  accountId: z.string().optional(),
})

export default async function ShippingAccountsPage() {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/settings/shipping-accounts' })
  if (access.status !== 'ok') redirect('/dashboard')
  const { store } = access

  const accounts = await db
    .select()
    .from(storeShippingAccounts)
    .where(eq(storeShippingAccounts.storeId, store.id))

  const connectedProviders = new Set(accounts.map((a) => a.provider))

  async function saveAccount(formData: FormData) {
    'use server'
    const access = await getDashboardStoreAccessContext({ path: '/dashboard/settings/shipping-accounts' })
    if (access.status !== 'ok') redirect('/dashboard')

    const parsed = accountSchema.safeParse({
      provider: formData.get('provider'),
      apiKey: formData.get('apiKey'),
      apiSecret: formData.get('apiSecret') || undefined,
      accountId: formData.get('accountId') || undefined,
    })

    if (!parsed.success) {
      redirect('/dashboard/settings/shipping-accounts?error=' + encodeURIComponent(parsed.error.issues[0]?.message ?? 'خطأ'))
    }

    // Upsert: insert or update
    const [existing] = await db
      .select({ id: storeShippingAccounts.id })
      .from(storeShippingAccounts)
      .where(eq(storeShippingAccounts.storeId, access.store.id))
      .limit(1)

    if (existing) {
      await db
        .update(storeShippingAccounts)
        .set({
          apiKey: parsed.data.apiKey,
          apiSecret: parsed.data.apiSecret ?? null,
          accountId: parsed.data.accountId ?? null,
          isActive: true,
        })
        .where(eq(storeShippingAccounts.id, existing.id))
    } else {
      await db.insert(storeShippingAccounts).values({
        storeId: access.store.id,
        provider: parsed.data.provider,
        apiKey: parsed.data.apiKey,
        apiSecret: parsed.data.apiSecret ?? null,
        accountId: parsed.data.accountId ?? null,
        isActive: true,
      })
    }

    redirect('/dashboard/settings/shipping-accounts')
  }

  async function removeAccount(formData: FormData) {
    'use server'
    const access = await getDashboardStoreAccessContext({ path: '/dashboard/settings/shipping-accounts' })
    if (access.status !== 'ok') redirect('/dashboard')
    const accountId = formData.get('accountId') as string
    if (accountId) {
      await db.delete(storeShippingAccounts).where(eq(storeShippingAccounts.id, accountId))
    }
    redirect('/dashboard/settings/shipping-accounts')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">حسابات شركات الشحن</h1>
      <p className="text-sm" style={{ color: 'var(--ds-text-muted)' }}>
        اربط متجرك بشركات الشحن لإنشاء بوالص الشحن تلقائياً من صفحة الطلبات
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const account = accounts.find((a) => a.provider === provider.id)
          const isConnected = connectedProviders.has(provider.id)

          return (
            <div key={provider.id} className="card-surface rounded-lg border p-4" style={{ borderColor: 'var(--ds-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{provider.description}</p>
                </div>
                {isConnected && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    متصل ✅
                  </span>
                )}
              </div>

              {isConnected && account ? (
                <form action={removeAccount}>
                  <input type="hidden" name="accountId" value={account.id} />
                  <button
                    type="submit"
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    style={{ borderColor: 'var(--ds-border)' }}
                  >
                    إزالة الاتصال
                  </button>
                </form>
              ) : (
                <details className="group">
                  <summary className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: 'var(--ds-border)', color: 'var(--ds-primary)' }}>
                    إعداد الاتصال
                  </summary>
                  <form action={saveAccount} className="mt-3 space-y-3">
                    <input type="hidden" name="provider" value={provider.id} />
                    <div>
                      <label className="mb-1 block text-xs font-medium">API Key *</label>
                      <input
                        type="password"
                        name="apiKey"
                        required
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: 'var(--ds-border)' }}
                      />
                    </div>
                    {(provider.id === 'aramex') && (
                      <div>
                        <label className="mb-1 block text-xs font-medium">API Secret</label>
                        <input
                          type="password"
                          name="apiSecret"
                          className="w-full rounded-lg border px-3 py-1.5 text-sm"
                          style={{ borderColor: 'var(--ds-border)' }}
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-xs font-medium">Account ID</label>
                      <input
                        type="text"
                        name="accountId"
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: 'var(--ds-border)' }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-lg px-4 py-1.5 text-xs font-medium text-white"
                      style={{ backgroundColor: 'var(--ds-primary)' }}
                    >
                      حفظ الاتصال
                    </button>
                  </form>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
