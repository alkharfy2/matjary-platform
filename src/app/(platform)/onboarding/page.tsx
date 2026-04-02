'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Check, Palette, Sparkles, Store, TicketCheck } from 'lucide-react'
import { buildTenantDashboardHref } from '@/lib/tenant/urls'
import { slugify } from '@/lib/utils'
import { Button, Card } from '@/components/ui'
import { FloatingAccent, Reveal } from '@/components/motion'
import { AiStoreSuggestion } from './_components/ai-store-suggestion'
import type { AiStoreBuilderResponse } from '@/lib/ai/types'

const STEPS = ['معلومات المتجر', 'اختيار الخطة', 'مراجعة الانطلاق'] as const

interface Plan {
  id: string
  name: string
  nameEn: string | null
  priceMonthly: string
  priceYearly: string | null
  orderFee: string | null
  maxProducts: number | null
  maxOrdersPerMonth: number | null
  features: string[]
  sortOrder: number
}

const storeCategories = [
  { value: 'clothing', label: 'ملابس' },
  { value: 'electronics', label: 'إلكترونيات' },
  { value: 'food', label: 'طعام ومشروبات' },
  { value: 'beauty', label: 'جمال وعناية' },
  { value: 'other', label: 'أخرى' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdDashboardUrl, setCreatedDashboardUrl] = useState<string | null>(null)
  const [checkingExistingStore, setCheckingExistingStore] = useState(true)
  const [showAiBuilder, setShowAiBuilder] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<AiStoreBuilderResponse | null>(null)

  const router = useRouter()
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/auth/sign-in')
    }
  }, [isLoaded, userId, router])

  useEffect(() => {
    if (!isLoaded) return
    if (!userId) {
      setCheckingExistingStore(false)
      return
    }

    let isMounted = true

    fetch('/api/stores/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((res) => {
        if (!isMounted) return

        const slug = res?.data?.store?.slug
        if (slug) {
          const dashboardUrl = buildTenantDashboardHref(slug, {
            origin: window.location.origin,
          })
          router.replace(dashboardUrl)
          return
        }

        setCheckingExistingStore(false)
      })
      .catch(() => {
        if (!isMounted) return
        setCheckingExistingStore(false)
      })

    return () => {
      isMounted = false
    }
  }, [isLoaded, userId, router])

  useEffect(() => {
    if (step !== 1 || plans.length > 0) return

    setPlansLoading(true)
    fetch('/api/plans')
      .then((response) => response.json())
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setPlans(res.data)
          setSelectedPlanId(res.data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false))
  }, [plans.length, step])

  if (!isLoaded || !userId || checkingExistingStore) {
    return (
      <div className="flex min-h-screen items-center justify-center app-shell-gradient px-4">
        <Card variant="feature" className="min-w-[280px] text-center">
          <p className="text-sm text-[var(--ds-text-muted)]">جارٍ تجهيز تجربة إنشاء متجرك...</p>
        </Card>
      </div>
    )
  }

  if (createdDashboardUrl) {
    return (
      <div className="app-shell-gradient relative min-h-screen overflow-hidden py-12">
        <FloatingAccent tone="primary" size="lg" className="-right-16 top-10" />
        <FloatingAccent tone="accent" size="md" className="-left-8 bottom-16" />
        <div className="mx-auto max-w-3xl px-4">
          <Reveal variant="scale">
            <Card variant="hero" className="px-6 py-10 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_18px_38px_rgba(16,185,129,0.18)]">
                <Check className="h-9 w-9" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">تم الإنشاء</p>
              <h1 className="mt-3 ds-heading text-3xl font-black text-[var(--ds-text)] sm:text-4xl">متجرك أصبح جاهزًا</h1>
              <p className="mt-3 text-sm leading-8 text-[var(--ds-text-muted)] sm:text-base">
                تم إعداد متجرك بنجاح. الخطوة التالية هي الدخول إلى لوحة التحكم وإضافة المنتجات وتخصيص الواجهة.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Button
                  type="button"
                  glow
                  size="lg"
                  onClick={() => {
                    window.location.href = createdDashboardUrl
                  }}
                >
                  الدخول إلى لوحة التحكم
                </Button>
                <p className="max-w-full break-all rounded-2xl border border-[var(--ds-border)] bg-white/88 px-4 py-2 text-xs text-[var(--ds-text-muted)]" dir="ltr">
                  {createdDashboardUrl}
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    )
  }

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null

  function handleNext() {
    if (step === 0 && (!storeName.trim() || !storeSlug.trim())) {
      setErrorMessage('يجب إدخال اسم المتجر ورابطه قبل الانتقال للخطوة التالية.')
      return
    }

    if (step === 0 && category === 'other' && !customCategory.trim()) {
      setErrorMessage('يرجى كتابة التصنيف المخصص عند اختيار أخرى.')
      return
    }

    setErrorMessage('')
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1)
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep((current) => current - 1)
    }
  }

  function handleAiAccept(suggestion: AiStoreBuilderResponse) {
    setStoreName(suggestion.storeName)
    setStoreSlug(slugify(suggestion.storeName))
    setAiSuggestion(suggestion)
    setShowAiBuilder(false)
    setStep(1)
  }

  async function handleSubmit() {
    if (!storeName.trim() || !storeSlug.trim()) {
      setErrorMessage('اسم المتجر ورابطه مطلوبان لإكمال الإنشاء.')
      return
    }

    if (category === 'other' && !customCategory.trim()) {
      setErrorMessage('يرجى كتابة التصنيف المخصص عند اختيار أخرى.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName.trim(),
          slug: storeSlug.trim(),
          category: (category === 'other' ? customCategory.trim() : category) || undefined,
          planId: selectedPlanId || undefined,
          aiSuggestion: aiSuggestion || undefined,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const dashboardUrl = buildTenantDashboardHref(result.data.slug, {
          origin: window.location.origin,
        })
        setCreatedDashboardUrl(dashboardUrl)
      } else {
        setErrorMessage(result.error || 'حدث خطأ أثناء إنشاء المتجر.')
      }
    } catch {
      setErrorMessage('حدث خطأ في الاتصال. حاول مرة أخرى.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-shell-gradient relative min-h-screen overflow-hidden py-10">
      <FloatingAccent tone="primary" size="lg" className="-right-16 top-10" />
      <FloatingAccent tone="accent" size="md" className="-left-8 bottom-10" />

      <div className="mx-auto max-w-[1180px] px-4">
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <Reveal className="space-y-5">
            <Card variant="hero" className="relative overflow-hidden p-6 sm:p-7">
              <div className="space-y-5">
                <span className="ds-pill text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  رحلة إنشاء المتجر
                </span>

                <div className="space-y-3">
                  <h1 className="ds-heading text-3xl font-black text-[var(--ds-text)] sm:text-4xl">
                    انطلق بمتجرك في ثلاث خطوات واضحة
                  </h1>
                  <p className="text-sm leading-8 text-[var(--ds-text-muted)] sm:text-base">
                    أدخل معلومات المتجر، اختر الخطة، ثم راجع ملخص الانطلاق قبل الدخول إلى لوحة التحكم.
                  </p>
                </div>

                <div className="space-y-3">
                  {STEPS.map((label, index) => (
                    <div
                      key={label}
                      className={`rounded-[24px] border px-4 py-3 transition-all ${
                        index === step
                          ? 'border-[var(--ds-primary)] bg-[var(--ds-primary-soft)] shadow-[var(--ds-glow-primary)]'
                          : index < step
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-[var(--ds-border)] bg-white/72'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                            index < step
                              ? 'bg-emerald-600 text-white'
                              : index === step
                                ? 'bg-[var(--ds-primary)] text-white'
                                : 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'
                          }`}
                        >
                          {index < step ? <Check className="h-4 w-4" /> : index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-[var(--ds-text)]">{label}</p>
                          <p className="text-sm text-[var(--ds-text-muted)]">
                            {index === 0 && 'اختيار الاسم والرابط والتصنيف'}
                            {index === 1 && 'انتقاء الخطة الأنسب لمرحلتك'}
                            {index === 2 && 'مراجعة جاهزية المتجر قبل الإنشاء'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card variant="feature" className="hidden space-y-4 lg:block">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-[var(--ds-primary-soft)] p-3 text-[var(--ds-primary)]">
                  {step === 0 ? <Store className="h-5 w-5" /> : step === 1 ? <TicketCheck className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
                </span>
                <div>
                  <p className="font-semibold text-[var(--ds-text)]">ملخص مباشر</p>
                  <p className="text-sm text-[var(--ds-text-muted)]">كل تعديل هنا ينعكس فورًا على ملخص الإنشاء.</p>
                </div>
              </div>

              <div className="space-y-3 rounded-[24px] border border-[var(--ds-border)] bg-white/84 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">اسم المتجر</p>
                  <p className="mt-1 font-semibold text-[var(--ds-text)]">{storeName || 'لم يتم إدخاله بعد'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">الرابط</p>
                  <p className="mt-1 font-semibold text-[var(--ds-text)]" dir="ltr">
                    {storeSlug ? `${storeSlug}.matjary.com` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">التصنيف</p>
                  <p className="mt-1 font-semibold text-[var(--ds-text)]">
                    {category === 'other' ? (customCategory.trim() || 'لم يتم إدخاله بعد') : (storeCategories.find((item) => item.value === category)?.label ?? 'لم يتم اختياره بعد')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">الخطة</p>
                  <p className="mt-1 font-semibold text-[var(--ds-text)]">{selectedPlan?.name ?? 'سيتم اختيار الخطة في الخطوة التالية'}</p>
                </div>
              </div>
            </Card>
          </Reveal>

          <Reveal delay={120}>
            <Card variant="hero" className="p-5 sm:p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ds-text-soft)]">
                    الخطوة {step + 1} من {STEPS.length}
                  </p>
                  <h2 className="ds-heading text-2xl font-black text-[var(--ds-text)] sm:text-3xl">{STEPS[step]}</h2>
                </div>

                {step === 0 ? (
                  showAiBuilder ? (
                    <AiStoreSuggestion
                      onAccept={handleAiAccept}
                      onSkip={() => setShowAiBuilder(false)}
                    />
                  ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[var(--ds-text)]">اسم المتجر</label>
                      <input
                        type="text"
                        value={storeName}
                        onChange={(event) => setStoreName(event.target.value)}
                        placeholder="مثال: بيت القطن"
                        className="h-12 w-full rounded-[18px] border border-[var(--ds-border)] bg-white/90 px-4 shadow-[var(--ds-shadow-sm)] outline-none transition-all focus:border-[var(--ds-primary)]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[var(--ds-text)]">رابط المتجر</label>
                      <div className="flex overflow-hidden rounded-[18px] border border-[var(--ds-border)] bg-white/90 shadow-[var(--ds-shadow-sm)]">
                        <input
                          type="text"
                          value={storeSlug}
                          onChange={(event) =>
                            setStoreSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                          }
                          placeholder="bayt-alqutn"
                          className="h-12 flex-1 bg-transparent px-4 outline-none"
                          dir="ltr"
                        />
                        <span className="flex items-center border-s border-[var(--ds-border)] bg-[var(--ds-surface-muted)] px-4 text-sm text-[var(--ds-text-muted)]" dir="ltr">
                          .matjary.com
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-[var(--ds-text)]">تصنيف المتجر</label>
                      <select
                        value={category}
                        onChange={(event) => {
                          const nextCategory = event.target.value
                          setCategory(nextCategory)
                          if (nextCategory !== 'other') setCustomCategory('')
                        }}
                        className="h-12 w-full rounded-[18px] border border-[var(--ds-border)] bg-white/90 px-4 shadow-[var(--ds-shadow-sm)] outline-none transition-all focus:border-[var(--ds-primary)]"
                      >
                        <option value="">اختر التصنيف</option>
                        {storeCategories.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      {category === 'other' ? (
                        <div className="mt-3">
                          <label className="mb-2 block text-sm font-semibold text-[var(--ds-text)]">التصنيف المخصص</label>
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(event) => setCustomCategory(event.target.value)}
                            placeholder="اكتب تصنيف متجرك"
                            className="h-12 w-full rounded-[18px] border border-[var(--ds-border)] bg-white/90 px-4 shadow-[var(--ds-shadow-sm)] outline-none transition-all focus:border-[var(--ds-primary)]"
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="sm:col-span-2 text-center">
                      <button
                        type="button"
                        onClick={() => setShowAiBuilder(true)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        ✨ أو اترك الذكاء الاصطناعي يساعدك
                      </button>
                    </div>
                  </div>
                  )
                ) : null}

                {step === 1 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--ds-text-muted)]">يمكنك تغيير الخطة لاحقًا من لوحة التحكم إذا احتجت إلى الترقية.</p>

                    {plansLoading ? (
                      <Card variant="feature" className="text-center">
                        <p className="text-sm text-[var(--ds-text-muted)]">جارٍ تحميل الخطط...</p>
                      </Card>
                    ) : plans.length === 0 ? (
                      <Card variant="feature" className="text-center">
                        <p className="text-sm text-[var(--ds-text-muted)]">سيتم اختيار الخطة المجانية تلقائيًا إذا لم تكن هناك خطط متاحة الآن.</p>
                      </Card>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-3">
                        {plans.map((plan) => {
                          const isSelected = selectedPlanId === plan.id
                          const isFree = parseFloat(plan.priceMonthly) === 0

                          return (
                            <button
                              key={plan.id}
                              type="button"
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`min-w-0 overflow-hidden rounded-[26px] border p-5 text-start transition-all ${
                                isSelected
                                  ? 'border-[var(--ds-primary)] bg-[var(--ds-primary-soft)] shadow-[var(--ds-glow-primary)]'
                                  : 'border-[var(--ds-border)] bg-white/84 shadow-[var(--ds-shadow-sm)] hover:-translate-y-1 hover:border-[var(--ds-border-strong)]'
                              }`}
                            >
                              <div className="flex min-w-0 items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-words text-lg font-bold text-[var(--ds-text)] [overflow-wrap:anywhere]">{plan.name}</p>
                                  <p className="mt-2 break-words text-sm text-[var(--ds-text-muted)] [overflow-wrap:anywhere]">
                                    {isFree ? 'مجاني' : `${parseFloat(plan.priceMonthly).toLocaleString('ar-EG')} ج.م / شهر`}
                                  </p>
                                </div>
                                {isSelected ? (
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ds-primary)] text-white">
                                    <Check className="h-4 w-4" />
                                  </span>
                                ) : null}
                              </div>

                              {plan.maxProducts !== null ? (
                                <p className="mt-3 break-words text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)] [overflow-wrap:anywhere]">
                                  حتى {plan.maxProducts} منتج
                                </p>
                              ) : null}

                              <ul className="mt-4 min-w-0 space-y-2">
                                {plan.features.map((feature) => (
                                  <li key={feature} className="flex min-w-0 items-start gap-2 text-sm text-[var(--ds-text-muted)]">
                                    <span className="mt-0.5 shrink-0 rounded-full bg-emerald-50 p-1 text-emerald-600">
                                      <Check className="h-3 w-3" />
                                    </span>
                                    <span className="block min-w-0 whitespace-normal break-all leading-7">
                                      {feature}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <Card variant="feature" className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">المتجر</p>
                          <p className="mt-1 font-semibold text-[var(--ds-text)]">{storeName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">الرابط</p>
                          <p className="mt-1 font-semibold text-[var(--ds-text)]" dir="ltr">{storeSlug ? `${storeSlug}.matjary.com` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">التصنيف</p>
                          <p className="mt-1 font-semibold text-[var(--ds-text)]">
                            {category === 'other' ? (customCategory.trim() || '—') : (storeCategories.find((item) => item.value === category)?.label ?? '—')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">الخطة المختارة</p>
                          <p className="mt-1 font-semibold text-[var(--ds-text)]">{selectedPlan?.name ?? 'الخطة المجانية'}</p>
                        </div>
                      </div>
                    </Card>

                    <div className="rounded-[24px] border border-[var(--ds-border)] bg-[var(--ds-surface-muted)] p-4 text-sm leading-7 text-[var(--ds-text-muted)]">
                      بعد إنشاء المتجر ستدخل إلى لوحة التحكم لإضافة المنتجات وتخصيص التصميم. سيتم استخدام الإعدادات الافتراضية
                      الآن، ويمكنك تعديلها لاحقًا بالكامل.
                    </div>
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="secondary" onClick={handleBack} disabled={step === 0 || isSubmitting}>
                    السابق
                  </Button>

                  {step < STEPS.length - 1 ? (
                    <Button glow onClick={handleNext}>
                      التالي
                    </Button>
                  ) : (
                    <Button glow onClick={handleSubmit} disabled={isSubmitting} loading={isSubmitting}>
                      {isSubmitting ? 'جارٍ إنشاء المتجر...' : 'إنشاء المتجر'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
        <Reveal delay={180} className="mt-6 lg:hidden">
          <Card variant="feature" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-[var(--ds-primary-soft)] p-3 text-[var(--ds-primary)]">
                {step === 0 ? <Store className="h-5 w-5" /> : step === 1 ? <TicketCheck className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-semibold text-[var(--ds-text)]">ملخص مباشر</p>
                <p className="text-sm text-[var(--ds-text-muted)]">كل تعديل هنا ينعكس فورًا على ملخص الإنشاء.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] border border-[var(--ds-border)] bg-white/84 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">اسم المتجر</p>
                <p className="mt-1 font-semibold text-[var(--ds-text)]">{storeName || 'لم يتم إدخاله بعد'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">الرابط</p>
                <p className="mt-1 font-semibold text-[var(--ds-text)]" dir="ltr">
                  {storeSlug ? `${storeSlug}.matjary.com` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">التصنيف</p>
                <p className="mt-1 font-semibold text-[var(--ds-text)]">
                  {category === 'other' ? (customCategory.trim() || 'لم يتم إدخاله بعد') : (storeCategories.find((item) => item.value === category)?.label ?? 'لم يتم اختياره بعد')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ds-text-soft)]">الخطة</p>
                <p className="mt-1 font-semibold text-[var(--ds-text)]">{selectedPlan?.name ?? 'سيتم اختيار الخطة في الخطوة التالية'}</p>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
