import { ProductForm } from '@/app/(dashboard)/dashboard/products/_components/product-form'

type EditProductPageProps = {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  return <ProductForm mode="edit" productId={id} />
}
