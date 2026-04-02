import { db } from '@/db'
import { storeReviewRequests, storeOrders, storeOrderItems, stores } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { TokenReviewForm } from './_components/token-review-form'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'قيّم تجربتك' }
}

export default async function TokenReviewPage({ params }: Props) {
  const { token } = await params

  const reviewRequest = await db.query.storeReviewRequests.findFirst({
    where: eq(storeReviewRequests.reviewToken, token),
  })

  if (!reviewRequest) notFound()

  if (reviewRequest.expiresAt && new Date() > reviewRequest.expiresAt) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--ds-text)]">انتهت صلاحية الرابط</h1>
        <p className="mt-2 text-[var(--ds-text-muted)]">هذا الرابط لم يعد صالحاً. يمكنك تقييم المنتج من صفحته مباشرة.</p>
      </div>
    )
  }

  if (reviewRequest.status === 'completed') {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--ds-text)]">شكراً لتقييمك! ⭐</h1>
        <p className="mt-2 text-[var(--ds-text-muted)]">لقد قمت بتقييم هذا الطلب بالفعل. شكراً لك!</p>
      </div>
    )
  }

  const order = await db.query.storeOrders.findFirst({
    where: eq(storeOrders.id, reviewRequest.orderId),
  })

  if (!order) notFound()

  const orderItems = await db.query.storeOrderItems.findMany({
    where: eq(storeOrderItems.orderId, order.id),
  })

  const store = await db.query.stores.findFirst({
    where: eq(stores.id, reviewRequest.storeId),
    columns: { name: true, slug: true },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--ds-text)] md:text-3xl">قيّم تجربتك</h1>
        <p className="mt-2 text-[var(--ds-text-muted)]">
          شكراً لتسوقك من {store?.name}! نحب نسمع رأيك في المنتجات اللي اشتريتها.
        </p>
      </div>

      <TokenReviewForm
        token={token}
        orderId={order.id}
        storeId={reviewRequest.storeId}
        customerName={reviewRequest.customerName ?? order.customerName}
        items={orderItems
          .filter((item) => item.productId !== null)
          .map((item) => ({
            id: item.id,
            productId: item.productId!,
            name: item.name,
            image: item.image,
            quantity: item.quantity,
          }))}
      />
    </div>
  )
}
