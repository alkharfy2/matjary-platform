import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { storeProducts } from '@/db/schema'
import {
  getDashboardProductCategories,
  getDashboardProducts,
  normalizeDashboardProductsFilters,
  type DashboardProductsFilters,
} from '@/lib/queries/dashboard-products'
import { getDashboardStoreAccessContext } from '@/lib/api/auth'
import {
  resolveUniqueProductSku,
  resolveUniqueProductSlug,
} from '@/lib/api/dashboard/products'
import { formatDate, formatPrice } from '@/lib/utils'
import { Button, Card, Input, Select } from '@/components/ui'
import {
  EmptyState,
  FilterBar,
  PageHeader,
  PaginationBar,
} from '@/components/patterns'

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildQuery(
  filters: DashboardProductsFilters,
  patch: Partial<DashboardProductsFilters>
) {
  const next = { ...filters, ...patch }
  const searchParams = new URLSearchParams()

  if (next.search) searchParams.set('search', next.search)
  if (next.category) searchParams.set('category', next.category)
  if (next.status !== 'all') searchParams.set('status', next.status)
  if (next.sort !== 'newest') searchParams.set('sort', next.sort)
  if (next.page > 1) searchParams.set('page', String(next.page))
  if (next.limit !== 20) searchParams.set('limit', String(next.limit))

  const query = searchParams.toString()
  return query ? `/dashboard/products?${query}` : '/dashboard/products'
}

function getStatusBadgeClass(isActive: boolean) {
  return isActive
    ? 'inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700'
    : 'inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'
}

export default async function ProductsListPage({ searchParams }: ProductsPageProps) {
  const access = await getDashboardStoreAccessContext({ path: '/dashboard/products' })
  if (access.status === 'unauthenticated') {
    redirect('/auth/sign-in?redirect_url=%2Fdashboard%2Fproducts')
  }
  if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
    redirect('/forbidden?scope=dashboard-store')
  }

  const { store } = access
  if (!store) notFound()

  const rawParams = await searchParams
  const filters = normalizeDashboardProductsFilters({
    search: getFirstParam(rawParams.search),
    category: getFirstParam(rawParams.category),
    status: getFirstParam(rawParams.status),
    page: getFirstParam(rawParams.page),
    limit: getFirstParam(rawParams.limit),
    sort: getFirstParam(rawParams.sort),
  })

  const returnTo = buildQuery(filters, {})


  async function duplicateProductAction(formData: FormData) {
    'use server'

    const access = await getDashboardStoreAccessContext({ path: '/dashboard/products' })
    if (access.status === 'unauthenticated') {
      redirect('/auth/sign-in?redirect_url=%2Fdashboard%2Fproducts')
    }
    if (access.status === 'forbidden' || access.status === 'missing_store_slug') {
      redirect('/forbidden?scope=dashboard-store')
    }

    const productId = String(formData.get('productId') ?? '').trim()
    const redirectTo = String(formData.get('returnTo') ?? '/dashboard/products')
    if (!productId) redirect(redirectTo)

    const existing = await db
      .select()
      .from(storeProducts)
      .where(and(eq(storeProducts.id, productId), eq(storeProducts.storeId, access.store.id)))
      .limit(1)

    const source = existing[0]
    if (!source) redirect(redirectTo)

    const newSlug = await resolveUniqueProductSlug(access.store.id, source.name)
    const newSku = await resolveUniqueProductSku(access.store.id)

    const duplicated = await db
      .insert(storeProducts)
      .values({
        storeId: source.storeId,
        name: source.name,
        slug: newSlug,
        description: source.description,
        shortDescription: source.shortDescription,
        price: source.price,
        compareAtPrice: source.compareAtPrice,
        costPrice: source.costPrice,
        sku: newSku,
        barcode: source.barcode,
        images: source.images,
        variants: source.variants,
        stock: source.stock,
        trackInventory: source.trackInventory,
        isActive: source.isActive,
        isFeatured: source.isFeatured,
        isDigital: source.isDigital,
        weight: source.weight,
        tags: source.tags,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        categoryId: source.categoryId,
        sortOrder: source.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: storeProducts.id })

    revalidatePath('/dashboard/products')

    const newProductId = duplicated[0]?.id
    if (newProductId) {
      redirect(`/dashboard/products/${newProductId}`)
    }

    redirect(redirectTo)
  }

  const [productsResult, categories] = await Promise.all([
    getDashboardProducts(store.id, filters),
    getDashboardProductCategories(store.id),
  ])

  const hasPrevPage = productsResult.page > 1
  const hasNextPage = productsResult.page < productsResult.totalPages

  return (
    <div className="space-y-6">
      <PageHeader
        title={'\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a'}
        description={'\u0625\u062f\u0627\u0631\u0629 \u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631 \u0648\u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0628\u0634\u0643\u0644 \u0623\u0633\u0631\u0639 \u0648\u0623\u0643\u062b\u0631 \u0648\u0636\u0648\u062d\u064b\u0627.'}
        action={
          <Link href="/dashboard/products/new">
            <Button>{'+ \u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062a\u062c'}</Button>
          </Link>
        }
      />

      <form method="GET">
        <FilterBar>
          <Input
            type="text"
            name="search"
            defaultValue={filters.search}
            placeholder={'\u0627\u0628\u062d\u062b \u0639\u0646 \u0645\u0646\u062a\u062c...'}
          />

          <Select name="category" defaultValue={filters.category}>
            <option value="">{'\u0643\u0644 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a'}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select name="status" defaultValue={filters.status}>
            <option value="all">{'\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a'}</option>
            <option value="active">{'\u0646\u0634\u0637'}</option>
            <option value="draft">{'\u0645\u0633\u0648\u062f\u0629'}</option>
          </Select>

          <Select name="sort" defaultValue={filters.sort}>
            <option value="newest">{'\u0627\u0644\u0623\u062d\u062f\u062b'}</option>
            <option value="oldest">{'\u0627\u0644\u0623\u0642\u062f\u0645'}</option>
            <option value="price-asc">{'\u0627\u0644\u0633\u0639\u0631: \u0627\u0644\u0623\u0642\u0644 \u0623\u0648\u0644\u064b\u0627'}</option>
            <option value="price-desc">{'\u0627\u0644\u0633\u0639\u0631: \u0627\u0644\u0623\u0639\u0644\u0649 \u0623\u0648\u0644\u064b\u0627'}</option>
          </Select>

          <input type="hidden" name="limit" value={String(filters.limit)} />

          <div className="md:col-span-4 flex flex-wrap items-center gap-2">
            <Button type="submit" variant="secondary">{'\u062a\u0637\u0628\u064a\u0642 \u0627\u0644\u0641\u0644\u0627\u062a\u0631'}</Button>
            <Link href="/dashboard/products">
              <Button variant="ghost" type="button">{'\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0636\u0628\u0637'}</Button>
            </Link>
          </div>
        </FilterBar>
      </form>

      {productsResult.products.length === 0 ? (
        <EmptyState
          title={'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629'}
          description={'\u062c\u0631\u0651\u0628 \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0641\u0644\u0627\u062a\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0623\u0648 \u0623\u0636\u0641 \u0645\u0646\u062a\u062c\u064b\u0627 \u062c\u062f\u064a\u062f\u064b\u0627.'}
          action={
            <Link href="/dashboard/products/new">
              <Button>{'\u0625\u0636\u0627\u0641\u0629 \u0623\u0648\u0644 \u0645\u0646\u062a\u062c'}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {productsResult.products.map((product) => (
              <Card key={product.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--ds-text)]">{product.name}</p>
                    <p className="truncate text-xs text-[var(--ds-text-muted)]">{product.slug}</p>
                  </div>
                  <span className={getStatusBadgeClass(product.isActive)}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                    {product.isActive ? '\u0646\u0634\u0637' : '\u0645\u0633\u0648\u062f\u0629'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-[var(--ds-text-muted)]">{'\u0627\u0644\u0633\u0639\u0631'}</p>
                  <div className="text-end">
                    <p className="font-medium text-[var(--ds-text)]">{formatPrice(Number(product.price))}</p>
                    {product.compareAtPrice ? (
                      <p className="text-xs text-[var(--ds-text-muted)] line-through">
                        {formatPrice(Number(product.compareAtPrice))}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-[var(--ds-text-muted)]">{'\u0627\u0644\u0645\u062e\u0632\u0648\u0646'}</p>
                  <p className="text-end text-[var(--ds-text)]">{product.stock}</p>
                  <p className="text-[var(--ds-text-muted)]">{'\u0627\u0644\u062a\u0635\u0646\u064a\u0641'}</p>
                  <p className="text-end text-[var(--ds-text)]">{product.categoryName ?? '\u0628\u062f\u0648\u0646 \u062a\u0635\u0646\u064a\u0641'}</p>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--ds-text-muted)]">{formatDate(product.createdAt)}</p>
                  <div className="flex items-center gap-2">
                    <form action={duplicateProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Button variant="ghost" size="sm" type="submit">{'إنشاء نسخة'}</Button>
                    </form>
                    <Link href={`/dashboard/products/${product.id}`}>
                      <Button variant="secondary" size="sm">{'\u062a\u0639\u062f\u064a\u0644'}</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-hidden p-0 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0645\u0646\u062a\u062c'}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0633\u0639\u0631'}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0645\u062e\u0632\u0648\u0646'}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u062a\u0635\u0646\u064a\u0641'}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u062d\u0627\u0644\u0629'}</th>
                    <th className="px-4 py-3 text-start text-sm font-medium text-[var(--ds-text-muted)]">{'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0625\u0636\u0627\u0641\u0629'}</th>
                    <th className="px-4 py-3 text-end text-sm font-medium text-[var(--ds-text-muted)]">{'\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a'}</th>
                  </tr>
                </thead>
                <tbody>
                  {productsResult.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-muted)]">
                            {product.images[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--ds-text)]">{product.name}</p>
                            <p className="text-xs text-[var(--ds-text-muted)]">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--ds-text)]">{formatPrice(Number(product.price))}</p>
                        {product.compareAtPrice ? (
                          <p className="text-xs text-[var(--ds-text-muted)] line-through">
                            {formatPrice(Number(product.compareAtPrice))}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[var(--ds-text)]">{product.stock}</td>
                      <td className="px-4 py-3 text-[var(--ds-text)]">{product.categoryName ?? '\u0628\u062f\u0648\u0646 \u062a\u0635\u0646\u064a\u0641'}</td>
                      <td className="px-4 py-3">
                        <span className={getStatusBadgeClass(product.isActive)}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                          {product.isActive ? '\u0646\u0634\u0637' : '\u0645\u0633\u0648\u062f\u0629'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--ds-text-muted)]">{formatDate(product.createdAt)}</td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <form action={duplicateProductAction}>
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <Button variant="ghost" size="sm" type="submit">{'إنشاء نسخة'}</Button>
                          </form>
                          <Link href={`/dashboard/products/${product.id}`}>
                            <Button variant="secondary" size="sm">{'\u062a\u0639\u062f\u064a\u0644'}</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <PaginationBar
            page={productsResult.page}
            totalPages={productsResult.totalPages}
            summary={`\u0635\u0641\u062d\u0629 ${productsResult.page} \u0645\u0646 ${productsResult.totalPages} (\u0625\u062c\u0645\u0627\u0644\u064a ${productsResult.total})`}
            prevHref={hasPrevPage ? buildQuery(filters, { page: productsResult.page - 1 }) : undefined}
            nextHref={hasNextPage ? buildQuery(filters, { page: productsResult.page + 1 }) : undefined}
          />
        </>
      )}
    </div>
  )
}

