import { notFound } from 'next/navigation'
import { and, desc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db'
import { storeCustomers } from '@/db/schema'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { escapeLike, formatDate, formatPrice } from '@/lib/utils'
import { Card, Input } from '@/components/ui'
import { EmptyState, PageHeader } from '@/components/patterns'

type CustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const store = await getCurrentStore()
  if (!store) notFound()

  const rawParams = await searchParams
  const search = (getFirstParam(rawParams.search) ?? '').trim()

  const conditions = [eq(storeCustomers.storeId, store.id)]

  if (search) {
    const safe = `%${escapeLike(search)}%`
    conditions.push(
      or(
        ilike(storeCustomers.name, safe),
        ilike(storeCustomers.phone, safe),
        ilike(storeCustomers.email, safe)
      )!
    )
  }

  const customers = await db
    .select()
    .from(storeCustomers)
    .where(and(...conditions))
    .orderBy(desc(storeCustomers.createdAt))
    .limit(100)

  return (
    <div className="space-y-6">
      <PageHeader title="العملاء" description={`إجمالي العملاء: ${customers.length}`} />

      <form method="GET">
        <Card>
          <Input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="ابحث عن عميل بالاسم أو الهاتف..."
          />
        </Card>
      </form>

      {customers.length === 0 ? (
        <EmptyState title="لا يوجد عملاء بعد" description="ستظهر بيانات العملاء عند وصول أول طلبات." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {customers.map((customer) => (
              <Card key={customer.id}>
                <p className="font-semibold text-[var(--ds-text)]">{customer.name}</p>
                <p className="mt-1 text-sm text-[var(--ds-text)]" dir="ltr">{customer.phone}</p>
                {customer.email ? <p className="text-xs text-[var(--ds-text-muted)]" dir="ltr">{customer.email}</p> : null}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="text-[var(--ds-text-muted)]">الطلبات</p>
                  <p className="text-end text-[var(--ds-text)]">{customer.totalOrders}</p>
                  <p className="text-[var(--ds-text-muted)]">إجمالي المشتريات</p>
                  <p className="text-end font-medium text-[var(--ds-text)]">
                    {formatPrice(Number(customer.totalSpent ?? 0), store.settings?.currency ?? 'EGP')}
                  </p>
                  <p className="text-[var(--ds-text-muted)]">تاريخ التسجيل</p>
                  <p className="text-end text-[var(--ds-text-muted)]">{formatDate(customer.createdAt)}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">الاسم</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">الهاتف</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">عدد الطلبات</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">إجمالي المشتريات</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--ds-text-muted)]">تاريخ التسجيل</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-4">
                        <p className="font-medium text-[var(--ds-text)]">{customer.name}</p>
                        {customer.email ? <p className="text-xs text-[var(--ds-text-muted)]" dir="ltr">{customer.email}</p> : null}
                      </td>
                      <td className="px-4 py-4 text-[var(--ds-text)]" dir="ltr">{customer.phone}</td>
                      <td className="px-4 py-4 text-[var(--ds-text)]">{customer.totalOrders}</td>
                      <td className="px-4 py-4 font-medium text-[var(--ds-text)]">
                        {formatPrice(Number(customer.totalSpent ?? 0), store.settings?.currency ?? 'EGP')}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--ds-text-muted)]">{formatDate(customer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
