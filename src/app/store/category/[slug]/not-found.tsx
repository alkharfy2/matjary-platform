import Link from 'next/link'
import { getCurrentStore } from '@/lib/tenant/get-current-store'
import { storePath } from '@/lib/tenant/store-path'

export default async function CategoryNotFound() {
  const store = await getCurrentStore()
  const homeHref = storePath('/', { storeSlug: store?.slug ?? null })

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-2">التصنيف غير موجود</h2>
        <p className="text-gray-600 mb-6">
          لم يتم العثور على هذا التصنيف في المتجر الحالي. قد يكون الرابط غير صحيح.
        </p>
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  )
}
