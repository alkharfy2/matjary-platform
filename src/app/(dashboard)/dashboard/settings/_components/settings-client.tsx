'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/patterns'
import { saveSettings } from '../_actions'

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
  fakeOrderBlockerEnabled?: boolean
  fakeOrderMinTrustScore?: number
  fakeOrderAutoReject?: boolean
  abandonedCartEnabled?: boolean
  abandonedCartDelayMinutes?: number
  abandonedCartMessage?: string | null
  abandonedCartChannel?: 'whatsapp' | 'sms'
  exitIntentEnabled?: boolean
  exitIntentMessage?: string | null
  exitIntentCouponCode?: string | null
  exitIntentPages?: 'all' | 'product' | 'checkout' | 'home'
  reviewsEnabled?: boolean
  reviewAutoApprove?: boolean
}

type SocialLinksPayload = {
  facebook?: string
  instagram?: string
  twitter?: string
  tiktok?: string
  youtube?: string
}

export type SettingsInitialData = {
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
  facebookPixelId: string
  facebookConversionApiToken: string
  facebookTestEventCode: string
  tiktokPixelId: string
  googleAnalyticsId: string
  snapchatPixelId: string
  whatsappFloatingEnabled: boolean
  whatsappFloatingPosition: 'left' | 'right'
  whatsappDefaultMessage: string
  whatsappOrderButtonEnabled: boolean
  emailNotificationsEnabled: boolean
  merchantEmailOnNewOrder: boolean
  fakeOrderBlockerEnabled: boolean
  fakeOrderMinTrustScore: number
  fakeOrderAutoReject: boolean
  abandonedCartEnabled: boolean
  abandonedCartDelayMinutes: number
  abandonedCartMessage: string
  abandonedCartChannel: 'whatsapp' | 'sms'
  exitIntentEnabled: boolean
  exitIntentMessage: string
  exitIntentCouponCode: string
  exitIntentPages: 'all' | 'product' | 'checkout' | 'home'
  reviewsEnabled: boolean
  reviewAutoApprove: boolean
}

function buildInitialForm(data: SettingsInitialData): SettingsFormState {
  const settings = data.settings ?? {}
  const socialLinks = data.socialLinks ?? {}
  return {
    name: data.name ?? '',
    description: data.description ?? '',
    contactEmail: data.contactEmail ?? '',
    contactPhone: data.contactPhone ?? '',
    contactWhatsapp: data.contactWhatsapp ?? '',
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
    fakeOrderBlockerEnabled: settings.fakeOrderBlockerEnabled ?? false,
    fakeOrderMinTrustScore: settings.fakeOrderMinTrustScore ?? 30,
    fakeOrderAutoReject: settings.fakeOrderAutoReject ?? false,
    abandonedCartEnabled: settings.abandonedCartEnabled ?? false,
    abandonedCartDelayMinutes: settings.abandonedCartDelayMinutes ?? 30,
    abandonedCartMessage: settings.abandonedCartMessage ?? '',
    abandonedCartChannel: settings.abandonedCartChannel ?? 'whatsapp',
    exitIntentEnabled: settings.exitIntentEnabled ?? false,
    exitIntentMessage: settings.exitIntentMessage ?? '',
    exitIntentCouponCode: settings.exitIntentCouponCode ?? '',
    exitIntentPages: settings.exitIntentPages ?? 'all',
    reviewsEnabled: settings.reviewsEnabled ?? true,
    reviewAutoApprove: settings.reviewAutoApprove ?? false,
  }
}

interface SettingsClientProps {
  initialData: SettingsInitialData
}

export default function SettingsClient({ initialData }: SettingsClientProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [form, setForm] = useState<SettingsFormState>(() => buildInitialForm(initialData))

  const canSubmit = useMemo(() => form.name.trim().length >= 2, [form.name])

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
      const result = await saveSettings({
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
          fakeOrderBlockerEnabled: form.fakeOrderBlockerEnabled,
          fakeOrderMinTrustScore: form.fakeOrderMinTrustScore,
          fakeOrderAutoReject: form.fakeOrderAutoReject,
          abandonedCartEnabled: form.abandonedCartEnabled,
          abandonedCartDelayMinutes: form.abandonedCartDelayMinutes,
          abandonedCartMessage: form.abandonedCartMessage.trim() || null,
          abandonedCartChannel: form.abandonedCartChannel,
          exitIntentEnabled: form.exitIntentEnabled,
          exitIntentMessage: form.exitIntentMessage.trim() || null,
          exitIntentCouponCode: form.exitIntentCouponCode.trim() || null,
          exitIntentPages: form.exitIntentPages,
          reviewsEnabled: form.reviewsEnabled,
          reviewAutoApprove: form.reviewAutoApprove,
        },
      })

      if (!result.success) {
        throw new Error(result.error || 'تعذر حفظ الإعدادات')
      }

      setSuccessMessage('تم حفظ إعدادات المتجر بنجاح')
      router.refresh()
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
              <label className="mb-1 block text-sm font-medium">Snapchat Pixel ID</label>
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

        {/* P1: حاجب الطلبات الوهمية */}
        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">🛡️ حاجب الطلبات الوهمية</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.fakeOrderBlockerEnabled}
                onChange={(event) => setFormField('fakeOrderBlockerEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل فحص العملاء عند الطلب</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">الحد الأدنى لنقاط الثقة (0–100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.fakeOrderMinTrustScore}
                onChange={(event) => setFormField('fakeOrderMinTrustScore', Number(event.target.value))}
                className="w-full max-w-xs rounded-lg border px-4 py-2"
              />
              <p className="mt-1 text-xs text-[var(--ds-text-muted)]">العملاء اللي نقاطهم أقل من الحد ده هيتم تحذيرك أو رفض طلبهم.</p>
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.fakeOrderAutoReject}
                onChange={(event) => setFormField('fakeOrderAutoReject', event.target.checked)}
                className="h-5 w-5"
              />
              <span>رفض الطلب تلقائياً (بدلاً من التحذير فقط)</span>
            </label>
          </div>
        </div>

        {/* P1: استرجاع السلة المتروكة */}
        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">🛒 استرجاع السلة المتروكة</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.abandonedCartEnabled}
                onChange={(event) => setFormField('abandonedCartEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل تتبع السلات المتروكة</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">مدة الانتظار (بالدقائق)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={form.abandonedCartDelayMinutes}
                onChange={(event) => setFormField('abandonedCartDelayMinutes', Number(event.target.value))}
                className="w-full max-w-xs rounded-lg border px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">رسالة التذكير</label>
              <input
                type="text"
                value={form.abandonedCartMessage}
                onChange={(event) => setFormField('abandonedCartMessage', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                placeholder="مرحباً! لاحظنا إنك ما كملت طلبك..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">قناة التذكير</label>
              <select
                value={form.abandonedCartChannel}
                onChange={(event) => setFormField('abandonedCartChannel', event.target.value as 'whatsapp' | 'sms')}
                className="w-full max-w-xs rounded-lg border px-4 py-2"
              >
                <option value="whatsapp">واتساب</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
        </div>

        {/* P1: نافذة Exit-Intent */}
        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">🎁 نافذة Exit-Intent المنبثقة</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.exitIntentEnabled}
                onChange={(event) => setFormField('exitIntentEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل نافذة العرض عند محاولة المغادرة</span>
            </label>
            <div>
              <label className="mb-1 block text-sm font-medium">رسالة العرض</label>
              <input
                type="text"
                value={form.exitIntentMessage}
                onChange={(event) => setFormField('exitIntentMessage', event.target.value)}
                className="w-full rounded-lg border px-4 py-2"
                placeholder="لا تفوّت هذا العرض! 🎁"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">كود الخصم (اختياري)</label>
              <input
                type="text"
                value={form.exitIntentCouponCode}
                onChange={(event) => setFormField('exitIntentCouponCode', event.target.value)}
                className="w-full max-w-xs rounded-lg border px-4 py-2"
                dir="ltr"
                placeholder="SAVE10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">الصفحات المستهدفة</label>
              <select
                value={form.exitIntentPages}
                onChange={(event) => setFormField('exitIntentPages', event.target.value as 'all' | 'product' | 'checkout' | 'home')}
                className="w-full max-w-xs rounded-lg border px-4 py-2"
              >
                <option value="all">جميع الصفحات</option>
                <option value="product">صفحات المنتجات فقط</option>
                <option value="checkout">صفحة الدفع فقط</option>
                <option value="home">الصفحة الرئيسية فقط</option>
              </select>
            </div>
          </div>
        </div>

        {/* P4-B: Reviews Settings */}
        <div className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">⭐ إعدادات التقييمات</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.reviewsEnabled}
                onChange={(event) => setFormField('reviewsEnabled', event.target.checked)}
                className="h-5 w-5"
              />
              <span>تفعيل التقييمات — السماح للعملاء بتقييم المنتجات</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.reviewAutoApprove}
                onChange={(event) => setFormField('reviewAutoApprove', event.target.checked)}
                className="h-5 w-5"
              />
              <span>موافقة تلقائية — نشر التقييمات بدون مراجعة</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="w-full rounded-lg bg-[var(--ds-primary)] px-6 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>
    </div>
  )
}
