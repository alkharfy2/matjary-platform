'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useStore } from '@/lib/tenant/store-context'
import { getUpsellOffer, addUpsellToOrder } from '../_actions'


type UpsellOffer = {
  ruleId: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    compareAtPrice: number | null
    images: string[]
  }
  discountType: 'percentage' | 'fixed'
  discountValue: number
  finalPrice: number
}

type UpsellOfferProps = {
  orderId: string
  orderNumber: string
}

export function UpsellOffer({ orderId, orderNumber: _orderNumber }: UpsellOfferProps) {
  const store = useStore()
  const [offer, setOffer] = useState<UpsellOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const currency = store.settings.currency === 'EGP' ? 'ج.م' : store.settings.currency

  useEffect(() => {
    async function fetchOffer() {
      try {
        const data = await getUpsellOffer(orderId)
        if (data.success && data.data) {
          setOffer(data.data)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchOffer()
  }, [orderId])

  if (loading || !offer || dismissed || added) return null

  const handleAdd = async () => {
    setAdding(true)
    try {
      const result = await addUpsellToOrder(orderId, offer.ruleId, offer.product.id)
      if (result.success) {
        setAdded(true)
      }
    } finally {
      setAdding(false)
    }
  }

  const discountLabel = offer.discountType === 'percentage'
    ? `خصم ${offer.discountValue}%`
    : `خصم ${offer.discountValue} ${currency}`

  return (
    <div className="mt-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-center">
      <p className="mb-3 text-lg font-bold text-amber-800">🎉 عرض خاص لك!</p>

      {offer.product.images[0] && (
        <div className="mx-auto mb-3 h-32 w-32 overflow-hidden rounded-lg">
          <Image
            src={offer.product.images[0]}
            alt={offer.product.name}
            width={128}
            height={128}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <p className="mb-1 font-medium">{offer.product.name}</p>
      <p className="mb-3 text-sm">
        <span className="text-gray-400 line-through">{offer.product.price} {currency}</span>
        {' '}
        <span className="text-lg font-bold text-green-600">{offer.finalPrice} {currency}</span>
        {' '}
        <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
          {discountLabel}
        </span>
      </p>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleAdd}
          disabled={adding}
          className="w-full max-w-xs rounded-lg bg-amber-500 px-6 py-3 font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
        >
          {adding ? 'جاري الإضافة...' : 'أضف لطلبي بضغطة واحدة ✨'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          لا شكراً
        </button>
      </div>
    </div>
  )
}
