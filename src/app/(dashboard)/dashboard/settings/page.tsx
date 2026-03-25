'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/patterns'

type StoreSettingsPayload = {
  currency?: string
  enableCod?: boolean
  enableKashier?: boolean
  kashierMerchantId?: string | null
  facebookPixelId?: string | null
  facebookConversionApiToken?: string | null
  facebookTestEventCode?: string | null
  tiktokPixelId?: string | null
  googleAnalyticsId?: string | null
  snapchatPixelId?: string | null
  whatsappFloatingEnabled?: boolean
  whatsappFloatingPosition?: 'left' | 'right'
  whatsappDefaultMessage?: string | null
  whatsappOrderButtonEnabled?: boolean
  emailNotificationsEnabled?: boolean
  merchantEmailOnNewOrder?: boolean
}

type SocialLinksPayload = {
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
}

type SettingsApiResponse = {
  name: string
  description: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactWhatsapp: string | null
  settings: StoreSettingsPayload
  socialLinks: SocialLinksPayload | null
}

type SettingsFormState = {
  name: string
  description: string
  contactEmail: string
  contactPhone: string
  contactWhatsapp: string
  facebook: string
  instagram: string
  tiktok: string
  twitter: string
  youtube: string
  enableCod: boolean
  enableKashier: boolean
  kashierMerchantId: string
  currency: string
  // Tracking
  facebookPixelId: string
  facebookConversionApiToken: string
  facebookTestEventCode: string
  tiktokPixelId: string
  googleAnalyticsId: string
  snapchatPixelId: string
  // WhatsApp
  whatsappFloatingEnabled: boolean
  whatsappFloatingPosition: 'left' | 'right'
  whatsappDefaultMessage: string
  whatsappOrderButtonEnabled: boolean
  // Email
  emailNotificationsEnabled: boolean
  merchantEmailOnNewOrder: boolean
}

const emptyFormState: SettingsFormState = {
  name: '',
  description: '',
  contactEmail: '',
  contactPhone: '',
  contactWhatsapp: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  twitter: '',
  youtube: '',
  enableCod: true,
  enableKashier: true,
  kashierMerchantId: '',
  currency: 'EGP',
  facebookPixelId: '',
  facebookConversionApiToken: '',
  facebookTestEventCode: '',
  tiktokPixelId: '',
  googleAnalyticsId: '',
  snapchatPixelId: '',
  whatsappFloatingEnabled: true,
  whatsappFloatingPosition: 'left',
  whatsappDefaultMessage: '',
  whatsappOrderButtonEnabled: false,
  emailNotificationsEnabled: true,
  merchantEmailOnNewOrder: true,
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [form, setForm] = useState<SettingsFormState>(emptyFormState)

  const canSubmit = useMemo(() => form.name.trim().length >= 2, [form.name])

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch('/api/dashboard/settings')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحميل إعدادات المتجر')
      }

      const payload = data.data as SettingsApiResponse
      const settings = payload.settings ?? {}
      const socialLinks = payload.socialLinks ?? {}

      setForm({
        name: payload.name ?? '',
        description: payload.description ?? '',
        contactEmail: payload.contactEmail ?? '',
        contactPhone: payload.contactPhone ?? '',
        contactWhatsapp: payload.contactWhatsapp ?? '',
        facebook: socialLinks.facebook ?? '',
        instagram: socialLinks.instagram ?? '',
        tiktok: socialLinks.tiktok ?? '',
        twitter: socialLinks.twitter ?? '',
        youtube: socialLinks.youtube ?? '',
        enableCod: settings.enableCod ?? true,
        enableKashier: settings.enableKashier ?? true,
        kashierMerchantId: settings.kashierMerchantId ?? '',
        currency: settings.currency ?? 'EGP',
        facebookPixelId: settings.facebookPixelId ?? '',
        facebookConversionApiToken: settings.facebookConversionApiToken ?? '',
        facebookTestEventCode: settings.facebookTestEventCode ?? '',
        tiktokPixelId: settings.tiktokPixelId ?? '',
        googleAnalyticsId: settings.googleAnalyticsId ?? '',
        snapchatPixelId: settings.snapchatPixelId ?? '',
        whatsappFloatingEnabled: settings.whatsappFloatingEnabled ?? true,
        whatsappFloatingPosition: settings.whatsappFloatingPosition ?? 'left',
        whatsappDefaultMessage: settings.whatsappDefaultMessage ?? '',
        whatsappOrderButtonEnabled: settings.whatsappOrderButtonEnabled ?? false,
        emailNotificationsEnabled: settings.emailNotificationsEnabled ?? true,
        merchantEmailOnNewOrder: settings.merchantEmailOnNewOrder ?? true,
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل إعدادات المتجر')
    } finally {
      setLoading(false)
    }
  }

  function setFormField<K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          contactEmail: form.contactEmail.trim() || null,
          contactPhone: form.contactPhone.trim() || null,
          contactWhatsapp: form.contactWhatsapp.trim() || null,
          socialLinks: {
            facebook: form.facebook.trim(),
            instagram: form.instagram.trim(),
            tiktok: form.tiktok.trim(),
            twitter: form.twitter.trim(),
            youtube: form.youtube.trim(),
          },
          settings: {
            enableCod: form.enableCod,
            enableKashier: form.enableKashier,
            kashierMerchantId: form.kashierMerchantId.trim() || null,
            facebookPixelId: form.facebookPixelId.trim() || null,
            facebookConversionApiToken: form.facebookConversionApiToken.trim() || null,
            facebookTestEventCode: form.facebookTestEventCode.trim() || null,
            tiktokPixelId: form.tiktokPixelId.trim() || null,
            googleAnalyticsId: form.googleAnalyticsId.trim() || null,
            snapchatPixelId: form.snapchatPixelId.trim() || null,
            whatsappFloatingEnabled: form.whatsappFloatingEnabled,
            whatsappFloatingPosition: form.whatsappFloatingPosition,
            whatsappDefaultMessage: form.whatsappDefaultMessage.trim() || null,
            whatsappOrderButtonEnabled: form.whatsappOrderButtonEnabled,
            emailNotificationsEnabled: form.emailNotificationsEnabled,
            merchantEmailOnNewOrder: form.merchantEmailOnNewOrder,
          },
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر حفظ الإعدادات')
      }

      setSuccessMessage('تم حفظ إعدادات المتجر بنجاح')
      await loadSettings()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="إعدادات المتجر"
        description="حدّث بيانات المتجر ووسائل التواصل وإعدادات الدفع من واجهة أكثر ترتيبًا ووضوحًا."
      />

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">الإعدادات العامة</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">اسم المتجر</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setFormField('name', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                aria-label="اسم المتجر"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">وصف المتجر</label>
              <textarea
                value={form.description}
                onChange={(event) => setFormField('description', event.target.value)}
                className="min-h-[80px] w-full rounded-lg border px-4 py-2"
                aria-label="وصف المتجر"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">العملة</label>
              <input
                value={form.currency}
                disabled
                aria-label="العملة"
                className="w-full rounded-lg border bg-[var(--ds-surface-muted)] px-4 py-2"
              />
            </div>
          </div>
        </div>

        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">معلومات التواصل</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">رقم الهاتف</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(event) => setFormField('contactPhone', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                aria-label="رقم الهاتف"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">رقم الواتساب</label>
              <input
                type="tel"
                value={form.contactWhatsapp}
                onChange={(event) => setFormField('contactWhatsapp', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                aria-label="رقم الواتساب"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(event) => setFormField('contactEmail', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                aria-label="البريد الإلكتروني"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">وسائل التواصل الاجتماعي</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">فيسبوك</label>
              <input
                type="url"
                value={form.facebook}
                onChange={(event) => setFormField('facebook', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">إنستجرام</label>
              <input
                type="url"
                value={form.instagram}
                onChange={(event) => setFormField('instagram', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">تيك توك</label>
              <input
                type="url"
                value={form.tiktok}
                onChange={(event) => setFormField('tiktok', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="https://tiktok.com/@..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">تويتر</label>
              <input
                type="url"
                value={form.twitter}
                onChange={(event) => setFormField('twitter', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="https://x.com/..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">يوتيوب</label>
              <input
                type="url"
                value={form.youtube}
                onChange={(event) => setFormField('youtube', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="https://youtube.com/..."
              />
            </div>
          </div>
        </div>

        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">إعدادات الدفع</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.enableCod}
                onChange={(event) => setFormField('enableCod', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل الدفع عند الاستلام (COD)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.enableKashier}
                onChange={(event) => setFormField('enableKashier', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل الدفع الإلكتروني (Kashier)</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">Kashier Merchant ID</label>
              <input
                type="text"
                value={form.kashierMerchantId}
                onChange={(event) => setFormField('kashierMerchantId', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                disabled={!form.enableKashier}
                aria-label="Kashier Merchant ID"
              />
            </div>
          </div>
        </div>

        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">📊 إعدادات التتبع والإعلانات</h2>
          <p className="mb-4 text-sm text-[var(--ds-text-muted)]">أضف معرّفات التتبع لقياس أداء إعلاناتك على المنصات المختلفة</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Facebook Pixel ID</label>
              <input
                type="text"
                value={form.facebookPixelId}
                onChange={(event) => setFormField('facebookPixelId', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="123456789012345"
                aria-label="Facebook Pixel ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Facebook Conversion API Token</label>
              <input
                type="password"
                value={form.facebookConversionApiToken}
                onChange={(event) => setFormField('facebookConversionApiToken', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="اختياري — لتحسين دقة التتبع"
                aria-label="Facebook Conversion API Token"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Facebook Test Event Code</label>
              <input
                type="text"
                value={form.facebookTestEventCode}
                onChange={(event) => setFormField('facebookTestEventCode', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="TEST12345 — للاختبار فقط"
                aria-label="Facebook Test Event Code"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">TikTok Pixel ID</label>
              <input
                type="text"
                value={form.tiktokPixelId}
                onChange={(event) => setFormField('tiktokPixelId', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="CP1234567890"
                aria-label="TikTok Pixel ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Google Analytics Measurement ID</label>
              <input
                type="text"
                value={form.googleAnalyticsId}
                onChange={(event) => setFormField('googleAnalyticsId', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="G-XXXXXXXXXX"
                aria-label="Google Analytics ID"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Snapchat Pixel ID <span className="text-xs text-gray-400">(قريبًا)</span></label>
              <input
                type="text"
                value={form.snapchatPixelId}
                onChange={(event) => setFormField('snapchatPixelId', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="abc123-def456"
                aria-label="Snapchat Pixel ID"
              />
            </div>
          </div>
        </div>

        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">📱 إعدادات WhatsApp</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.whatsappFloatingEnabled}
                onChange={(event) => setFormField('whatsappFloatingEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل زر WhatsApp العائم</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">موضع الزر العائم</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="whatsappPosition"
                    checked={form.whatsappFloatingPosition === 'left'}
                    onChange={() => setFormField('whatsappFloatingPosition', 'left')}
                  />
                  <span>يسار</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="whatsappPosition"
                    checked={form.whatsappFloatingPosition === 'right'}
                    onChange={() => setFormField('whatsappFloatingPosition', 'right')}
                  />
                  <span>يمين</span>
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الرسالة الافتراضية</label>
              <input
                type="text"
                value={form.whatsappDefaultMessage}
                onChange={(event) => setFormField('whatsappDefaultMessage', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                placeholder="مرحباً، أنا أتواصل من متجرك..."
                aria-label="رسالة واتساب الافتراضية"
              />
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.whatsappOrderButtonEnabled}
                onChange={(event) => setFormField('whatsappOrderButtonEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل زر &quot;اطلب عبر واتساب&quot; في صفحة المنتج</span>
            </label>
          </div>
        </div>

        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">📧 إعدادات الإشعارات</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.emailNotificationsEnabled}
                onChange={(event) => setFormField('emailNotificationsEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل إشعارات البريد الإلكتروني للعملاء</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.merchantEmailOnNewOrder}
                onChange={(event) => setFormField('merchantEmailOnNewOrder', event.target.checked)}
                className="h-5 w-5"
              />
              <span>إرسال إيميل لي عند وصول طلب جديد</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || loading || saving}
          className="w-full rounded-lg bg-[var(--ds-primary)] px-6 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--ds-text-muted)]">جاري تحميل بيانات الإعدادات...</p>
      ) : null}
    </div>
  )
}



