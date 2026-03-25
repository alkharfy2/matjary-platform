'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCartStore } from '@/lib/stores/cart-store'
import { useStore } from '@/lib/tenant/store-context'
import { formatPrice } from '@/lib/utils'
import { storePath } from '@/lib/tenant/store-path'
import { TrustBadges } from '@/app/store/_components/trust-badges'
import { shippingAddressSchema } from '@/lib/validations/order'

// التسعير النهائي يجب أن يتم في /api/checkout server-side
// (إعادة جلب المنتجات + حساب الشحن والخصم)

const EGYPT_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'البحر الأحمر',
  'البحيرة', 'الفيوم', 'الغربية', 'الإسماعيلية', 'المنوفية',
  'المنيا', 'القليوبية', 'الوادي الجديد', 'السويس', 'أسوان',
  'أسيوط', 'بني سويف', 'بورسعيد', 'دمياط', 'الشرقية',
  'جنوب سيناء', 'كفر الشيخ', 'مطروح', 'الأقصر', 'قنا',
  'شمال سيناء', 'سوهاج',
]

type ShippingForm = {
  customerName: string
  customerPhone: string
  governorate: string
  city: string
  area: string
  street: string
  building: string
  notes: string
}

type ShippingLocation = {
  latitude: number
  longitude: number
}

type ReverseGeocodedAddress = {
  governorate?: string
  city?: string
  area?: string
  street?: string
}

type ShippingResponse = {
  success: true
  data: {
    cost: number
    estimatedDays: string | null
    freeShippingMinimum: number | null
    supported: boolean
    message?: string
  }
} | { success: false; error: string }

type ShippingGovernoratesResponse = {
  success: true
  data: {
    governorates: string[]
  }
} | { success: false; error: string }

type CouponResponse = {
  success: true
  data: {
    valid: boolean
    reason?: string
    discountAmount?: number
    type?: string
    value?: number
  }
} | { success: false; error: string }

type CheckoutResponse = {
  success: true
  data: {
    orderId: string
    orderNumber: string
    total: number
    paymentUrl?: string
  }
} | { success: false; error: string }

// ─── Inline spinner SVG ────────────────────────────────────────
function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ─── Reusable form field helpers ───────────────────────────────
function fieldClasses(hasError: boolean): string {
  return `w-full rounded-[18px] border bg-[var(--ds-surface-glass)] px-4 py-3 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--ds-surface-elevated)] ${
    hasError
      ? 'border-[var(--ds-danger)] focus:ring-[color:color-mix(in_oklab,var(--ds-danger)_22%,transparent)]'
      : 'border-[var(--ds-border)] focus:ring-[var(--ds-primary)]/35 hover:border-[var(--ds-border-strong)]'
  }`
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-[var(--ds-danger)]">{message}</p>
}

// ─── Section wrapper ───────────────────────────────────────────
function Section({
  number,
  title,
  headerAction,
  children,
}: {
  number: number
  title: string
  headerAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="surface-panel-elevated rounded-[28px]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--ds-border)]/70 px-4 py-4 sm:px-6">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))]"
          style={{ backgroundColor: 'var(--color-primary, #000)' }}
        >
          {number}
        </span>
        <h2 className="ds-heading text-xl font-black leading-snug text-[var(--ds-text)]">{title}</h2>
        {headerAction ? <div className="ms-auto">{headerAction}</div> : null}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  )
}

// ─── شريط الثقة ───────────────────────────────────────────────
const TRUST_ITEMS: { emoji: string; title: string }[] = [
  { emoji: '✅', title: 'دفع آمن واستلام مضمون' },
  { emoji: '🚚', title: 'شحن سريع داخل مصر والخليج' },
  { emoji: '🔁', title: 'استبدال/استرجاع بسهولة' },
]

function CheckoutTrustBar() {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-[24px] border border-[var(--ds-divider)] bg-[linear-gradient(180deg,var(--ds-surface-elevated),var(--ds-surface-glass))] p-4 shadow-[var(--ds-shadow-sm)] md:grid-cols-3">
      {TRUST_ITEMS.map((item) => (
        <div key={item.title} className="flex items-center gap-2 rounded-[18px] bg-[var(--ds-surface-glass)] px-3 py-3 text-center md:flex-col md:gap-1">
          <span className="text-lg" aria-hidden="true">{item.emoji}</span>
          <span className="text-sm font-semibold text-[var(--ds-text)]">{item.title}</span>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
export default function CheckoutPage() {
  const router = useRouter()
  const store = useStore()
  const { items, clearCart } = useCartStore()
  const currency = store.settings.currency ?? 'EGP'

  const [form, setForm] = useState<ShippingForm>({
    customerName: '',
    customerPhone: '',
    governorate: '',
    city: '',
    area: '',
    street: '',
    building: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'kashier'>('cod')
  const [couponCode, setCouponCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponMessage, setCouponMessage] = useState('')

  const [shippingCost, setShippingCost] = useState<number | null>(null)
  const [shippingSupported, setShippingSupported] = useState(true)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingGovernorates, setShippingGovernorates] = useState<string[]>([])
  const [shippingGovernoratesLoading, setShippingGovernoratesLoading] = useState(false)
  const [couponLoading, setCouponLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [shippingLocation, setShippingLocation] = useState<ShippingLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationStatus, setLocationStatus] = useState('')
  const [locationError, setLocationError] = useState('')

  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )
  const effectiveShipping = shippingCost ?? 0
  const total = subtotal + effectiveShipping - discount

  useEffect(() => {
    let isMounted = true

    async function loadShippingGovernorates() {
      setShippingGovernoratesLoading(true)
      try {
        const response = await fetch(`/api/shipping/governorates?storeId=${store.id}`, {
          cache: 'no-store',
        })
        const data: ShippingGovernoratesResponse = await response.json()

        if (!isMounted) return

        if (response.ok && data.success) {
          setShippingGovernorates(data.data.governorates)
          return
        }

        setShippingGovernorates([])
      } catch {
        if (!isMounted) return
        setShippingGovernorates([])
      } finally {
        if (isMounted) {
          setShippingGovernoratesLoading(false)
        }
      }
    }

    void loadShippingGovernorates()

    return () => {
      isMounted = false
    }
  }, [store.id])

  useEffect(() => {
    if (!form.governorate) return
    if (shippingGovernorates.includes(form.governorate)) return

    setForm((prev) => ({ ...prev, governorate: '' }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.governorate
      return next
    })
    setShippingCost(null)
    setShippingSupported(true)
  }, [form.governorate, shippingGovernorates])

  function updateField(field: keyof ShippingForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function normalizeGovernorateName(value: string | undefined): string | null {
    if (!value) return null

    const normalized = value
      .trim()
      .replace(/^محافظة\s+/, '')
      .replace(/\s+محافظة$/, '')
      .replace(/\s+Governorate$/i, '')
      .replace(/\s+/g, ' ')

    const directMatch = EGYPT_GOVERNORATES.find((g) => g === normalized)
    if (directMatch) return directMatch

    const key = normalized
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ')
      .trim()

    const aliases: Record<string, string> = {
      cairo: 'القاهرة',
      giza: 'الجيزة',
      alexandria: 'الإسكندرية',
      dakahlia: 'الدقهلية',
      'red sea': 'البحر الأحمر',
      beheira: 'البحيرة',
      fayoum: 'الفيوم',
      gharbia: 'الغربية',
      ismailia: 'الإسماعيلية',
      menofia: 'المنوفية',
      minya: 'المنيا',
      qalyubia: 'القليوبية',
      'new valley': 'الوادي الجديد',
      suez: 'السويس',
      aswan: 'أسوان',
      assiut: 'أسيوط',
      'beni suef': 'بني سويف',
      'port said': 'بورسعيد',
      damietta: 'دمياط',
      sharqia: 'الشرقية',
      'south sinai': 'جنوب سيناء',
      'kafr el sheikh': 'كفر الشيخ',
      matrouh: 'مطروح',
      luxor: 'الأقصر',
      qena: 'قنا',
      'north sinai': 'شمال سيناء',
      sohag: 'سوهاج',
    }

    if (aliases[key]) return aliases[key]

    const fuzzy = EGYPT_GOVERNORATES.find(
      (g) => g.includes(normalized) || normalized.includes(g)
    )
    return fuzzy ?? null
  }

  async function reverseGeocodeFromNominatim(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodedAddress | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse')
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('lat', String(latitude))
    url.searchParams.set('lon', String(longitude))
    url.searchParams.set('accept-language', 'ar')
    url.searchParams.set('addressdetails', '1')

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      address?: {
        state?: string
        governorate?: string
        county?: string
        city?: string
        town?: string
        village?: string
        suburb?: string
        neighbourhood?: string
        city_district?: string
        road?: string
        house_number?: string
      }
      display_name?: string
    }

    const address = data.address
    if (!address) return null

    const streetParts = [address.road, address.house_number].filter(Boolean)
    const fallbackStreet = data.display_name
      ?.split(',')
      .slice(0, 2)
      .join('، ')

    return {
      governorate: address.state ?? address.governorate ?? address.county,
      city: address.city ?? address.town ?? address.village,
      area: address.suburb ?? address.neighbourhood ?? address.city_district,
      street: streetParts.length > 0 ? streetParts.join(' ') : fallbackStreet,
    }
  }

  async function reverseGeocodeFromBigDataCloud(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodedAddress | null> {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
    url.searchParams.set('latitude', String(latitude))
    url.searchParams.set('longitude', String(longitude))
    url.searchParams.set('localityLanguage', 'ar')

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data = (await response.json()) as {
      principalSubdivision?: string
      city?: string
      locality?: string
    }

    return {
      governorate: data.principalSubdivision,
      city: data.city ?? data.locality,
      area: data.locality,
    }
  }

  async function resolveAddressFromCoordinates(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodedAddress | null> {
    try {
      const fromNominatim = await reverseGeocodeFromNominatim(latitude, longitude)
      if (
        fromNominatim &&
        (fromNominatim.governorate ||
          fromNominatim.city ||
          fromNominatim.area ||
          fromNominatim.street)
      ) {
        return fromNominatim
      }
    } catch {
      // Fallback below
    }

    try {
      return await reverseGeocodeFromBigDataCloud(latitude, longitude)
    } catch {
      return null
    }
  }

  function getLocationErrorMessage(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'number'
    ) {
      const code = (error as { code: number }).code
      if (code === 1) return 'تم رفض إذن الموقع. فعّل إذن الموقع من المتصفح.'
      if (code === 2) return 'تعذر تحديد الموقع الحالي. تأكد من تشغيل GPS.'
      if (code === 3) return 'انتهت مهلة تحديد الموقع. حاول مرة أخرى.'
    }

    return 'تعذر تحديد الموقع الآن. حاول مرة أخرى.'
  }

  async function handleUseCurrentLocation() {
    setLocationStatus('')
    setLocationError('')

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('المتصفح الحالي لا يدعم تحديد الموقع الجغرافي.')
      return
    }

    setLocating(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

      const latitude = Number(position.coords.latitude.toFixed(7))
      const longitude = Number(position.coords.longitude.toFixed(7))
      setShippingLocation({ latitude, longitude })

      const resolvedAddress = await resolveAddressFromCoordinates(latitude, longitude)

      const normalizedGovernorate = normalizeGovernorateName(
        resolvedAddress?.governorate?.trim()
      )
      const normalizedGovernorateSupported = normalizedGovernorate
        ? shippingGovernorates.includes(normalizedGovernorate)
        : false
      const city = resolvedAddress?.city?.trim()
      const area = resolvedAddress?.area?.trim()
      const street = resolvedAddress?.street?.trim()

      let autoFilledFields = 0

      if (!form.governorate && normalizedGovernorate && normalizedGovernorateSupported) {
        await handleGovernorateChange(normalizedGovernorate)
        autoFilledFields += 1
      }
      if (!form.city && city) {
        updateField('city', city)
        autoFilledFields += 1
      }
      if (!form.area && area) {
        updateField('area', area)
        autoFilledFields += 1
      }
      if (!form.street && street) {
        updateField('street', street)
        autoFilledFields += 1
      }

      if (autoFilledFields > 0) {
        setLocationStatus('تم تحديد الموقع وتعبئة حقول العنوان الفارغة تلقائيًا.')
      } else if (normalizedGovernorate && !normalizedGovernorateSupported) {
        setLocationStatus('تم تحديد موقعك، لكن المحافظة غير مدعومة للشحن حاليًا.')
      } else {
        setLocationStatus('تم حفظ موقعك الجغرافي. الحقول المعبأة مسبقًا لم تتغير.')
      }
    } catch (error) {
      setLocationError(getLocationErrorMessage(error))
    } finally {
      setLocating(false)
    }
  }

  async function handleGovernorateChange(governorate: string) {
    updateField('governorate', governorate)
    if (!governorate) {
      setShippingCost(null)
      setShippingSupported(true)
      return
    }

    if (!shippingGovernorates.includes(governorate)) {
      setShippingCost(null)
      setShippingSupported(false)
      return
    }

    setShippingLoading(true)
    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, governorate }),
      })
      const data: ShippingResponse = await res.json()
      if (data.success) {
        setShippingCost(data.data.cost)
        setShippingSupported(data.data.supported)
      } else {
        setShippingCost(null)
        setShippingSupported(false)
      }
    } catch {
      setShippingCost(null)
      setShippingSupported(false)
    } finally {
      setShippingLoading(false)
    }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponMessage('')
    setDiscount(0)
    setCouponApplied(false)

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          code: couponCode.trim(),
          subtotal,
        }),
      })
      const data: CouponResponse = await res.json()
      if (data.success && data.data.valid && data.data.discountAmount) {
        setDiscount(data.data.discountAmount)
        setCouponApplied(true)
        setCouponMessage('تم تطبيق الكوبون بنجاح')
      } else if (data.success && !data.data.valid) {
        setCouponMessage(data.data.reason ?? 'الكوبون غير صالح')
      } else if (!data.success) {
        setCouponMessage(data.error)
      }
    } catch {
      setCouponMessage('حدث خطأ أثناء التحقق من الكوبون')
    } finally {
      setCouponLoading(false)
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    const normalizedShipping = {
      governorate: form.governorate.trim(),
      city: form.city.trim(),
      area: form.area.trim() || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
      street: form.street.trim(),
      building: form.building.trim() || undefined,
    }

    const hasManualAddress =
      normalizedShipping.governorate.length > 0 &&
      normalizedShipping.city.length > 0 &&
      normalizedShipping.street.length > 0
    const hasCoordinates = Boolean(shippingLocation)

    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      errors.customerName = 'الاسم مطلوب (حرفين على الأقل)'
    }
    if (!form.customerPhone.trim() || form.customerPhone.trim().length < 10) {
      errors.customerPhone = 'رقم الهاتف غير صالح'
    }

    if (hasManualAddress) {
      const result = shippingAddressSchema.safeParse(normalizedShipping)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path[0]
          if (typeof field === 'string') {
            errors[field] = issue.message
          }
        }
      }
    } else if (!hasCoordinates) {
      errors.governorate = 'أدخل عنوان الشحن أو استخدم زر تحديد الموقع'
      errors.city = errors.governorate
      errors.street = errors.governorate
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    setSubmitError('')
    if (!validateForm()) return
    if (form.governorate.trim().length > 0 && !shippingSupported) {
      setSubmitError('المحافظة المختارة غير مدعومة للشحن')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          items: items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          shipping: {
            governorate: form.governorate.trim() || undefined,
            city: form.city.trim() || undefined,
            area: form.area.trim() || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
            street: form.street.trim() || undefined,
            building: form.building.trim() || undefined,
          },
          shippingLocation: shippingLocation
            ? {
                latitude: shippingLocation.latitude,
                longitude: shippingLocation.longitude,
              }
            : undefined,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          paymentMethod,
          couponCode: couponApplied ? couponCode.trim() : undefined,
        }),
      })
      const data: CheckoutResponse = await res.json()
      if (data.success) {
        clearCart()
        if (data.data.paymentUrl) {
          window.location.href = data.data.paymentUrl
        } else {
          router.push(
            storePath('/order-success', {
              storeSlug: store.slug,
              query: { order: data.data.orderNumber },
            })
          )
        }
      } else {
        setSubmitError(data.error)
      }
    } catch {
      setSubmitError('حدث خطأ أثناء إنشاء الطلب. حاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Empty state ─────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6">
        <div className="ds-hero-panel mx-auto flex max-w-xl flex-col items-center px-6 py-14 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--ds-surface-muted)] shadow-[var(--ds-shadow-sm)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-[var(--ds-text-muted)]/80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-extrabold leading-tight tracking-tight text-[var(--ds-text)] md:text-4xl">
            سلة التسوق فارغة
          </h1>
          <p className="mb-8 text-[var(--ds-text-muted)]">
            أضف منتجات إلى سلتك أولاً لإتمام الطلب
          </p>
          <Link
            href={storePath('/', { storeSlug: store.slug })}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            العودة للمتجر
          </Link>
        </div>
      </div>
    )
  }

  // ─── Main checkout layout ────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center gap-3 sm:gap-4">
        <Link
          href={storePath('/cart', { storeSlug: store.slug })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] text-[var(--ds-text-muted)] shadow-[var(--ds-shadow-sm)] transition-colors hover:bg-[var(--ds-surface-muted)]"
          aria-label="العودة للسلة"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 rtl:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--ds-text)] md:text-3xl">إتمام الطلب</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ═══ Form sections ═══ */}
        <div className="space-y-6 lg:col-span-2">
          {/* ── شريط الثقة ── */}
          <CheckoutTrustBar />

          {/* ── 1. بيانات العميل ── */}
          <Section number={1} title="بيانات العميل">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  الاسم الكامل <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className={fieldClasses(!!formErrors.customerName)}
                  placeholder="مثال: أحمد محمد"
                />
                <FieldError message={formErrors.customerName} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  رقم الهاتف <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={form.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className={fieldClasses(!!formErrors.customerPhone)}
                  placeholder="01xxxxxxxxx"
                />
                <FieldError message={formErrors.customerPhone} />
              </div>
            </div>
          </Section>

          {/* ── 2. عنوان الشحن ── */}
          <Section
            number={2}
            title="عنوان الشحن"
            headerAction={
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating || submitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {locating ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18.75a6.75 6.75 0 1 0 0-13.5 6.75 6.75 0 0 0 0 13.5Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 2.25v2.5m0 14.5v2.5m9.75-9.75h-2.5m-14.5 0h-2.5"
                    />
                  </svg>
                )}
                {locating ? 'جارٍ تحديد الموقع...' : 'حدد موقعي'}
              </button>
            }
          >
            <p className="mb-3 text-xs text-[var(--ds-text-muted)]">
              يمكنك إدخال عنوان الشحن يدويًا أو استخدام زر تحديد الموقع (واحد منهما على الأقل).
            </p>
            {locationStatus && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {locationStatus}
              </div>
            )}
            {locationError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {locationError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="checkout-governorate" className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  المحافظة <span className="text-red-400">*</span>
                </label>
                <select
                  id="checkout-governorate"
                  value={form.governorate}
                  onChange={(e) => handleGovernorateChange(e.target.value)}
                  className={fieldClasses(!!formErrors.governorate)}
                  disabled={shippingGovernoratesLoading || shippingGovernorates.length === 0}
                >
                  <option value="">اختر المحافظة</option>
                  {shippingGovernorates.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
                <FieldError message={formErrors.governorate} />
                {!shippingGovernoratesLoading && shippingGovernorates.length === 0 && (
                  <p className="mt-1 text-xs text-orange-600">
                    لا توجد محافظات مفعلة للشحن حالياً لهذا المتجر
                  </p>
                )}
                {!shippingSupported && form.governorate && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    هذه المحافظة غير مدعومة للشحن حالياً
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="checkout-city" className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  المدينة <span className="text-red-400">*</span>
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className={fieldClasses(!!formErrors.city)}
                />
                <FieldError message={formErrors.city} />
              </div>
              <div>
                <label htmlFor="checkout-area" className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  المنطقة
                </label>
                <input
                  id="checkout-area"
                  type="text"
                  value={form.area}
                  onChange={(e) => updateField('area', e.target.value)}
                  className={fieldClasses(!!formErrors.area)}
                />
                <FieldError message={formErrors.area} />
              </div>
              <div>
                <label htmlFor="checkout-street" className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  الشارع <span className="text-red-400">*</span>
                </label>
                <input
                  id="checkout-street"
                  type="text"
                  value={form.street}
                  onChange={(e) => updateField('street', e.target.value)}
                  className={fieldClasses(!!formErrors.street)}
                />
                <FieldError message={formErrors.street} />
              </div>
              <div>
                <label htmlFor="checkout-building" className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  المبنى
                </label>
                <input
                  id="checkout-building"
                  type="text"
                  value={form.building}
                  onChange={(e) => updateField('building', e.target.value)}
                  className={fieldClasses(false)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className={fieldClasses(false)}
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>
            </div>
          </Section>

          {/* ── 3. كوبون الخصم ── */}
          <Section number={3} title="كوبون الخصم">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                dir="ltr"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value)
                  setCouponApplied(false)
                  setDiscount(0)
                  setCouponMessage('')
                }}
                placeholder="أدخل كود الخصم"
                className={`flex-1 ${fieldClasses(false)}`}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="inline-flex items-center gap-2 card-surface px-5 py-2.5 text-sm font-medium text-[var(--ds-text)] transition-colors hover:bg-[var(--ds-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponLoading && <Spinner />}
                {couponLoading ? 'جارٍ التحقق...' : 'تطبيق'}
              </button>
            </div>
            {couponMessage && (
              <div
                className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  couponApplied
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {couponApplied ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                )}
                {couponMessage}
              </div>
            )}
          </Section>

          {/* ── 4. طريقة الدفع ── */}
          <Section number={4} title="طريقة الدفع">
            <div className="space-y-3">
              <label
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-[var(--color-primary,#111827)] bg-[var(--ds-surface-muted)]'
                    : 'border-[var(--ds-border)] hover:border-[var(--ds-border)]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="h-4 w-4 accent-gray-900"
                />
                <div>
                  <p className="font-medium text-[var(--ds-text)]">الدفع عند الاستلام</p>
                  <p className="text-sm text-[var(--ds-text-muted)]">
                    ادفع نقداً عند استلام الطلب
                  </p>
                </div>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                  paymentMethod === 'kashier'
                    ? 'border-[var(--color-primary,#111827)] bg-[var(--ds-surface-muted)]'
                    : 'border-[var(--ds-border)] hover:border-[var(--ds-border)]'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="kashier"
                  checked={paymentMethod === 'kashier'}
                  onChange={() => setPaymentMethod('kashier')}
                  className="h-4 w-4 accent-gray-900"
                />
                <div>
                  <p className="font-medium text-[var(--ds-text)]">دفع إلكتروني (كاشير)</p>
                  <p className="text-sm text-[var(--ds-text-muted)]">
                    بطاقة ائتمان / فودافون كاش / فوري
                  </p>
                </div>
              </label>
            </div>
          </Section>
        </div>

        {/* ═══ Order Summary (sticky) ═══ */}
        <div className="h-fit lg:sticky lg:top-24">
          <div className="surface-panel-elevated rounded-[28px] p-4 sm:p-6">
            <h2 className="mb-5 text-xl font-bold leading-snug text-[var(--ds-text)] md:text-2xl">
              ملخص الطلب
            </h2>

            {/* Items list */}
            <div className="space-y-3 border-b border-[var(--ds-border)] pb-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId ?? 'default'}`}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[var(--ds-text)]">
                      {item.productName}
                      <span className="text-[var(--ds-text-muted)]/80"> × {item.quantity}</span>
                    </span>
                    {item.variantLabel && (
                      <span className="block text-xs text-[var(--ds-text-muted)]/80">
                        {item.variantLabel}
                      </span>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-medium text-[var(--ds-text)]">
                    {formatPrice(item.unitPrice * item.quantity, currency)}
                  </span>
                </div>
              ))}
            </div>

            {/* ── شريط الثقة ── */}
            <div className="pb-4">
              <CheckoutTrustBar />
            </div>

            {/* Totals */}
            <div className="space-y-3 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--ds-text-muted)]">المجموع الفرعي</span>
                <span className="font-medium text-[var(--ds-text)]">
                  {formatPrice(subtotal, currency)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--ds-text-muted)]">
                  الشحن
                  {shippingLoading && <Spinner className="h-3.5 w-3.5 text-[var(--ds-text-muted)]/80" />}
                </span>
                <span className="font-medium text-[var(--ds-text)]">
                  {shippingLoading
                    ? 'جارٍ الحساب...'
                    : shippingCost !== null
                      ? shippingCost === 0
                        ? 'مجاني'
                        : formatPrice(shippingCost, currency)
                      : 'اختر المحافظة'}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>الخصم</span>
                  <span className="font-medium">
                    - {formatPrice(discount, currency)}
                  </span>
                </div>
              )}

              <hr className="border-[var(--ds-border)]" />

              <div className="flex justify-between text-base font-bold">
                <span>الإجمالي</span>
                <span className="text-[var(--color-primary,#000)]">
                  {formatPrice(total, currency)}
                </span>
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {submitError}
              </div>
            )}

            {/* CTA */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 bg-[var(--color-primary,#16a34a)]"
              >
                {submitting && <Spinner className="h-5 w-5" />}
                {submitting ? 'جارٍ التأكيد...' : 'تأكيد الطلب'}
              </button>

              <Link
                href={storePath('/cart', { storeSlug: store.slug })}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] py-3 text-sm font-medium text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-colors hover:bg-[var(--ds-surface-muted)] active:scale-[0.98]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                  />
                </svg>
                العودة للسلة
              </Link>
            </div>

            {/* ─── شارات الثقة ─── */}
            <TrustBadges className="mt-6" />
          </div>
        </div>
      </div>
    </div>
  )
}




