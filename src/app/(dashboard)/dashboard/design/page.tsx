'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/patterns'
import type { StoreTheme } from '@/db/schema'
import { auditThemeColors, normalizeHexColor, sanitizeThemeColorsForUi } from '@/lib/theme-color-utils'

type HeroSlide = {
  id: string
  title: string | null
  subtitle: string | null
  imageUrl: string
  linkUrl: string | null
  buttonText: string | null
  sortOrder: number
  isActive: boolean
}

type SlideFormState = {
  title: string
  subtitle: string
  imageUrl: string
  linkUrl: string
  buttonText: string
  isActive: boolean
}

type ThemeColorFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

const defaultTheme: StoreTheme = {
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  accentColor: '#3b82f6',
  fontFamily: 'Cairo',
  borderRadius: '8px',
  headerStyle: 'simple',
}

const emptySlideForm: SlideFormState = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  buttonText: '',
  isActive: true,
}

function sortSlides(slides: HeroSlide[]) {
  return [...slides].sort((a, b) => a.sortOrder - b.sortOrder)
}

function ThemeColorField({ label, value, onChange }: ThemeColorFieldProps) {
  const safePickerValue = normalizeHexColor(value) ?? '#000000'

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safePickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-10 rounded-sm border border-[var(--ds-border)]"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="ltr"
          className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
        />
      </div>
    </div>
  )
}

export default function DesignPage() {
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<StoreTheme>(defaultTheme)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [slides, setSlides] = useState<HeroSlide[]>([])

  const [savingTheme, setSavingTheme] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [creatingSlide, setCreatingSlide] = useState(false)
  const [uploadingSlideImage, setUploadingSlideImage] = useState(false)
  const [movingSlideId, setMovingSlideId] = useState<string | null>(null)
  const [deletingSlideId, setDeletingSlideId] = useState<string | null>(null)
  const [togglingSlideId, setTogglingSlideId] = useState<string | null>(null)

  const [slideForm, setSlideForm] = useState<SlideFormState>(emptySlideForm)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const canCreateSlide = useMemo(() => {
    return slideForm.imageUrl.trim().length > 0
  }, [slideForm.imageUrl])
  const themeColorAudit = useMemo(() => {
    return auditThemeColors({
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
    })
  }, [theme.primaryColor, theme.secondaryColor, theme.accentColor])

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setErrorMessage(null)

      const [themeResponse, slidesResponse] = await Promise.all([
        fetch('/api/dashboard/design/theme'),
        fetch('/api/dashboard/design/hero-slides'),
      ])

      const [themeData, slidesData] = await Promise.all([
        themeResponse.json(),
        slidesResponse.json(),
      ])

      if (!themeResponse.ok || !themeData.success) {
        throw new Error(themeData.error || 'تعذر تحميل بيانات التصميم')
      }
      if (!slidesResponse.ok || !slidesData.success) {
        throw new Error(slidesData.error || 'تعذر تحميل شرائح الصفحة الرئيسية')
      }

      const responseTheme = themeData.data?.theme as Partial<StoreTheme> | undefined
      setTheme({ ...defaultTheme, ...responseTheme })
      setLogoUrl((themeData.data?.logoUrl as string | null) ?? null)
      setSlides(sortSlides(slidesData.data as HeroSlide[]))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحميل بيانات التصميم')
    } finally {
      setLoading(false)
    }
  }

  function setThemeField<K extends keyof StoreTheme>(key: K, value: StoreTheme[K]) {
    setTheme((prev) => ({ ...prev, [key]: value }))
  }

  function setSlideField<K extends keyof SlideFormState>(key: K, value: SlideFormState[K]) {
    setSlideForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveTheme() {
    setSavingTheme(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      if (themeColorAudit.hasInvalidHex) {
        throw new Error('\u0631\u062c\u0627\u0621\u064b \u0627\u062f\u062e\u0644 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0628\u0635\u064a\u063a\u0629 \u0635\u062d\u064a\u062d\u0629 \u0645\u062b\u0644 #RRGGBB')
      }

      const sanitized = sanitizeThemeColorsForUi({
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
      })

      const nextTheme = {
        ...theme,
        ...sanitized.theme,
      }

      const response = await fetch('/api/dashboard/design/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextTheme),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر حفظ إعدادات الألوان')
      }

      setTheme(nextTheme)
      setSuccessMessage(
        sanitized.notes.length > 0
          ? `\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0645\u0639 \u062a\u0639\u062f\u064a\u0644\u0627\u062a \u0637\u0641\u064a\u0641\u0629: ${sanitized.notes.join(' ')}`
          : '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0623\u0644\u0648\u0627\u0646 \u0628\u0646\u062c\u0627\u062d'
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ إعدادات الألوان')
    } finally {
      setSavingTheme(false)
    }
  }

  async function handleUploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'logo')

      const uploadResponse = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'تعذر رفع الشعار')
      }

      const url = String(uploadData.data.url)
      const saveResponse = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: url }),
      })
      const saveData = await saveResponse.json()

      if (!saveResponse.ok || !saveData.success) {
        throw new Error(saveData.error || 'تم رفع الشعار لكن تعذر حفظه')
      }

      setLogoUrl(url)
      setSuccessMessage('تم رفع الشعار وحفظه بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر رفع الشعار')
    } finally {
      setUploadingLogo(false)
      event.target.value = ''
    }
  }

  async function handleRemoveLogo() {
    setUploadingLogo(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: null }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر حذف الشعار')
      }

      setLogoUrl(null)
      setSuccessMessage('تم حذف الشعار')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حذف الشعار')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleUploadSlideImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingSlideImage(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'hero')

      const response = await fetch('/api/dashboard/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر رفع صورة الشريحة')
      }

      setSlideField('imageUrl', String(data.data.url))
      setSuccessMessage('تم رفع صورة الشريحة بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر رفع صورة الشريحة')
    } finally {
      setUploadingSlideImage(false)
      event.target.value = ''
    }
  }

  async function handleCreateSlide(event: React.FormEvent) {
    event.preventDefault()
    if (!canCreateSlide) return

    setCreatingSlide(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/dashboard/design/hero-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: slideForm.title.trim() || null,
          subtitle: slideForm.subtitle.trim() || null,
          imageUrl: slideForm.imageUrl.trim(),
          linkUrl: slideForm.linkUrl.trim() || null,
          buttonText: slideForm.buttonText.trim() || null,
          sortOrder: slides.length,
          isActive: slideForm.isActive,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر إنشاء الشريحة')
      }

      setSlides((prev) => sortSlides([...prev, data.data as HeroSlide]))
      setSlideForm(emptySlideForm)
      setSuccessMessage('تم إنشاء الشريحة بنجاح')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر إنشاء الشريحة')
    } finally {
      setCreatingSlide(false)
    }
  }

  async function handleToggleSlide(slide: HeroSlide) {
    setTogglingSlideId(slide.id)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/dashboard/design/hero-slides/${slide.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slide.isActive }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر تحديث حالة الشريحة')
      }

      setSlides((prev) =>
        prev.map((item) => (item.id === slide.id ? (data.data as HeroSlide) : item))
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث حالة الشريحة')
    } finally {
      setTogglingSlideId(null)
    }
  }

  async function handleDeleteSlide(slideId: string) {
    const confirmed = confirm('هل أنت متأكد من حذف هذه الشريحة؟')
    if (!confirmed) return

    setDeletingSlideId(slideId)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch(`/api/dashboard/design/hero-slides/${slideId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'تعذر حذف الشريحة')
      }

      setSlides((prev) => prev.filter((slide) => slide.id !== slideId))
      setSuccessMessage('تم حذف الشريحة')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حذف الشريحة')
    } finally {
      setDeletingSlideId(null)
    }
  }

  async function handleMoveSlide(slideId: string, direction: -1 | 1) {
    const ordered = sortSlides(slides)
    const currentIndex = ordered.findIndex((slide) => slide.id === slideId)
    const targetIndex = currentIndex + direction

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= ordered.length
    ) {
      return
    }

    setMovingSlideId(slideId)
    setErrorMessage(null)
    setSuccessMessage(null)

    const next = [...ordered]
    const [moved] = next.splice(currentIndex, 1)
    if (!moved) {
      setMovingSlideId(null)
      return
    }
    next.splice(targetIndex, 0, moved)

    const normalized = next.map((slide, index) => ({ ...slide, sortOrder: index }))
    const prevSortMap = new Map(ordered.map((slide) => [slide.id, slide.sortOrder]))
    const changed = normalized.filter((slide) => prevSortMap.get(slide.id) !== slide.sortOrder)

    setSlides(normalized)

    try {
      const requests = changed.map(async (slide) => {
        const response = await fetch(`/api/dashboard/design/hero-slides/${slide.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: slide.sortOrder }),
        })
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'تعذر تحديث ترتيب الشرائح')
        }
      })

      await Promise.all(requests)
      setSuccessMessage('تم تحديث ترتيب الشرائح')
    } catch (error) {
      setSlides(ordered)
      setErrorMessage(error instanceof Error ? error.message : 'تعذر تحديث ترتيب الشرائح')
    } finally {
      setMovingSlideId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Design"
        title="تصميم المتجر"
        description="خصص الألوان والشعار والـ hero slides من واجهة تخصيص أوضح وأقرب لشكل المتجر النهائي."
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="surface-panel-elevated p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">ألوان الثيم</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <ThemeColorField
                label="اللون الرئيسي"
                value={theme.primaryColor}
                onChange={(value) => setThemeField('primaryColor', value)}
              />

              <ThemeColorField
                label="اللون الثانوي"
                value={theme.secondaryColor}
                onChange={(value) => setThemeField('secondaryColor', value)}
              />

              <ThemeColorField
                label="لون التمييز"
                value={theme.accentColor}
                onChange={(value) => setThemeField('accentColor', value)}
              />

              <div>
                <label className="mb-1 block text-sm font-medium">نمط الهيدر</label>
                <select
                  value={theme.headerStyle}
                  onChange={(event) => setThemeField('headerStyle', event.target.value as StoreTheme['headerStyle'])}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                >
                  <option value="simple">بسيط</option>
                  <option value="centered">متمركز</option>
                  <option value="full">ممتد</option>
                </select>
              </div>
            </div>

            {themeColorAudit.issues.length > 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="mb-2 font-medium">??????? ???? ??? ???????:</p>
                <ul className="space-y-1">
                  {themeColorAudit.issues.map((issue) => (
                    <li key={issue.key}>{'\u2022'} {issue.message}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-700">???? ??? ??? ????? ???????? ?????? ??? ????? ???? ??????? ????? ????.</p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveTheme()}
                disabled={loading || savingTheme || themeColorAudit.hasInvalidHex}
                className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
              >
                {savingTheme ? 'جاري الحفظ...' : 'حفظ الألوان'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--ds-text-muted)]">معاينة سريعة:</span>
                <span
                  className="h-6 w-6 rounded-full border border-[var(--ds-border)]"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <span
                  className="h-6 w-6 rounded-full border border-[var(--ds-border)]"
                  style={{ backgroundColor: theme.secondaryColor }}
                />
                <span
                  className="h-6 w-6 rounded-full border border-[var(--ds-border)]"
                  style={{ backgroundColor: theme.accentColor }}
                />
              </div>
            </div>
          </section>

          <section className="surface-panel-elevated p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">شعار المتجر</h2>

            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-[var(--ds-border)] px-4 py-2 hover:bg-[var(--ds-surface-muted)]">
                {uploadingLogo ? 'جاري الرفع...' : 'رفع شعار'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  className="hidden"
                  disabled={uploadingLogo}
                />
              </label>
              {logoUrl ? (
                <button
                  type="button"
                  onClick={() => void handleRemoveLogo()}
                  disabled={uploadingLogo}
                  className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  حذف الشعار
                </button>
              ) : null}
            </div>

            {logoUrl ? (
              <div className="mt-4 w-fit rounded-lg border border-[var(--ds-border)] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="شعار المتجر" className="h-16 w-auto object-contain" />
              </div>
            ) : (
              <p className="mt-4 text-sm text-[var(--ds-text-muted)]">لا يوجد شعار مرفوع حالياً.</p>
            )}
          </section>
        </div>

        <section className="surface-panel-elevated p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">إدارة Hero Slides</h2>

          <form onSubmit={handleCreateSlide} className="space-y-4 rounded-lg border border-[var(--ds-border)] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">العنوان (اختياري)</label>
                <input
                  type="text"
                  value={slideForm.title}
                  onChange={(event) => setSlideField('title', event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">النص الفرعي (اختياري)</label>
                <input
                  type="text"
                  value={slideForm.subtitle}
                  onChange={(event) => setSlideField('subtitle', event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">صورة الشريحة</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={slideForm.imageUrl}
                  onChange={(event) => setSlideField('imageUrl', event.target.value)}
                  dir="ltr"
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2 sm:min-w-[240px] sm:flex-1"
                  required
                />
                <label className="cursor-pointer rounded-lg border border-[var(--ds-border)] px-4 py-2 hover:bg-[var(--ds-surface-muted)]">
                  {uploadingSlideImage ? 'جاري الرفع...' : 'رفع صورة'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadSlideImage}
                    className="hidden"
                    disabled={uploadingSlideImage}
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">رابط الزر (اختياري)</label>
                <input
                  type="text"
                  value={slideForm.linkUrl}
                  onChange={(event) => setSlideField('linkUrl', event.target.value)}
                  dir="ltr"
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">نص الزر (اختياري)</label>
                <input
                  type="text"
                  value={slideForm.buttonText}
                  onChange={(event) => setSlideField('buttonText', event.target.value)}
                  className="w-full rounded-lg border border-[var(--ds-border)] px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="slide-active"
                type="checkbox"
                checked={slideForm.isActive}
                onChange={(event) => setSlideField('isActive', event.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="slide-active" className="text-sm">
                الشريحة نشطة
              </label>
            </div>

            <button
              type="submit"
              disabled={!canCreateSlide || creatingSlide || uploadingSlideImage}
              className="rounded-lg bg-[var(--ds-primary)] px-4 py-2 text-white hover:bg-[var(--ds-primary-hover)] disabled:opacity-60"
            >
              {creatingSlide ? 'جاري الإضافة...' : 'إضافة شريحة'}
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="rounded-lg border border-[var(--ds-border)] p-4 text-sm text-[var(--ds-text-muted)]">
                جاري تحميل الشرائح...
              </div>
            ) : slides.length === 0 ? (
              <div className="rounded-lg border border-[var(--ds-border)] p-4 text-sm text-[var(--ds-text-muted)]">
                لا توجد شرائح بعد.
              </div>
            ) : (
              sortSlides(slides).map((slide, index) => (
                <div key={slide.id} className="rounded-lg border border-[var(--ds-border)] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-16 w-24 overflow-hidden rounded-lg border border-[var(--ds-border)] bg-[var(--ds-surface-muted)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slide.imageUrl} alt={slide.title ?? 'صورة الشريحة'} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium">{slide.title || 'بدون عنوان'}</p>
                        {slide.subtitle ? (
                          <p className="text-sm text-[var(--ds-text-muted)]">{slide.subtitle}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-[var(--ds-text-muted)]">الترتيب: {slide.sortOrder + 1}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleMoveSlide(slide.id, -1)}
                        disabled={index === 0 || movingSlideId === slide.id}
                        className="rounded-lg border border-[var(--ds-border)] px-2 py-1 text-xs hover:bg-[var(--ds-surface-muted)] disabled:opacity-40"
                      >
                        أعلى
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMoveSlide(slide.id, 1)}
                        disabled={index === slides.length - 1 || movingSlideId === slide.id}
                        className="rounded-lg border border-[var(--ds-border)] px-2 py-1 text-xs hover:bg-[var(--ds-surface-muted)] disabled:opacity-40"
                      >
                        أسفل
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleSlide(slide)}
                        disabled={togglingSlideId === slide.id}
                        className="rounded-lg border border-[var(--ds-border)] px-2 py-1 text-xs hover:bg-[var(--ds-surface-muted)] disabled:opacity-40"
                      >
                        {slide.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSlide(slide.id)}
                        disabled={deletingSlideId === slide.id}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}













