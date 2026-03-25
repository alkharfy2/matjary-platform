import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { ArrowLeft, ChartNoAxesCombined, Palette, Rocket, ShieldCheck, Sparkles, Store, WandSparkles } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { Button, Card } from '@/components/ui'
import { AnimatedCounter, FloatingAccent, ParallaxLayer, Reveal, StaggerGroup } from '@/components/motion'
import { db } from '@/db'
import { merchants, stores } from '@/db/schema'
import {
  buildTenantDashboardHref,
  buildTenantStorefrontHref,
} from '@/lib/tenant/urls'

export default async function PlatformHomePage() {
  const { userId } = await auth()

  let primaryHref = '/auth/sign-up'
  let primaryLabel = 'ابدأ مجانًا'
  let secondaryHref = '/features'
  let secondaryLabel = 'استكشف المميزات'

  if (userId) {
    try {
      const result = await db
        .select({ slug: stores.slug })
        .from(stores)
        .innerJoin(merchants, eq(stores.merchantId, merchants.id))
        .where(eq(merchants.clerkUserId, userId))
        .limit(1)

      const slug = result[0]?.slug
      if (slug) {
        primaryHref = buildTenantStorefrontHref(slug)
        primaryLabel = 'عرض متجرك'
        secondaryHref = buildTenantDashboardHref(slug)
        secondaryLabel = 'لوحة التحكم'
      } else {
        primaryHref = '/onboarding'
        primaryLabel = 'أنشئ متجرك'
        secondaryHref = '/auth/sign-in'
        secondaryLabel = 'تسجيل الدخول'
      }
    } catch (error) {
      console.error('Platform home CTA lookup failed:', error)
    }
  }

  const highlights = [
    {
      title: 'تحكم كامل في المبيعات',
      description: 'متابعة الطلبات والإيرادات والعملاء من لوحة واحدة محسّنة للسوق العربي.',
      icon: <ChartNoAxesCombined className="h-5 w-5" />,
    },
    {
      title: 'هوية متجر مرنة',
      description: 'ألوان، Hero banners، صفحات محتوى، وتجربة واجهة قابلة للتخصيص بسرعة.',
      icon: <Palette className="h-5 w-5" />,
    },
    {
      title: 'إطلاق أسرع وثقة أعلى',
      description: 'مسار شراء واضح، وسائل دفع متعددة، وتجربة متجر متجاوبة منذ اليوم الأول.',
      icon: <ShieldCheck className="h-5 w-5" />,
    },
  ]

  const metrics = [
    {
      label: 'مسارات رئيسية',
      suffix: '+',
      value: highlights.length,
      description: 'صفحات جاهزة للبيع، الإدارة، والتحويل',
    },
    {
      label: 'خيارات دفع',
      suffix: '',
      value: 2,
      description: 'دفع إلكتروني وCOD من داخل النظام',
    },
    {
      label: 'خطوات إطلاق',
      suffix: '',
      value: 3,
      description: 'سجّل، خصّص، وابدأ البيع خلال دقائق',
    },
  ]

  const journey = [
    {
      title: 'ابنِ متجرك بسرعة',
      body: 'ابدأ من onboarding واضح ثم فعّل هويتك وصفحاتك والمنتجات الأساسية.',
    },
    {
      title: 'اجعل الشراء أسهل',
      body: 'واجهة متجر محسّنة للعربي، بطاقات منتجات أوضح، وcheckout أكثر ثقة وسلاسة.',
    },
    {
      title: 'نمِّ من لوحة واحدة',
      body: 'راقب الأداء، عدّل المحتوى، وتابع الطلبات والعملاء بدون تشتيت.',
    },
  ]

  return (
    <div className="ds-section-stack">
      <section className="relative overflow-hidden">
        <FloatingAccent tone="primary" size="lg" className="-right-10 top-12" />
        <FloatingAccent tone="accent" size="md" className="-left-6 bottom-4" />

        <div className="ds-hero-panel overflow-visible px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.38fr_0.62fr]">
            <Reveal className="space-y-6">
              <div className="space-y-4">
                <span className="ds-pill text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  منصة تجارة إلكترونية عربية بتجربة أجمل وأوضح
                </span>

                <div className="space-y-4">
                  <h1 className="ds-display overflow-visible text-4xl font-black tracking-normal text-[var(--ds-text)] sm:text-5xl lg:text-6xl">
                    <span className="block pb-1 leading-[1.24] sm:leading-[1.2] lg:leading-[1.16]">أطلق متجرك الرقمي</span>
                    <span className="mt-3 block ds-text-gradient px-1 leading-[1.34] sm:mt-4 sm:px-2 sm:leading-[1.4] lg:leading-[1.24]">بهوية أقوى وتجربة بيع أسرع</span>
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-[var(--ds-text-muted)] sm:text-lg">
                    متجري يجمع بين موقع تسويقي مقنع، واجهة متجر حديثة، ولوحة تحكم عملية في نظام واحد
                    مصمم خصيصًا للعلامات العربية التي تريد البيع بثقة.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href={primaryHref}>
                  <Button size="lg" glow className="gap-2">
                    <Rocket className="h-4 w-4" />
                    {primaryLabel}
                  </Button>
                </Link>
                <Link href={secondaryHref}>
                  <Button variant="secondary" size="lg" className="gap-2">
                    {secondaryLabel}
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {metrics.map((metric, index) => (
                  <Reveal key={metric.label} delay={120 + index * 100}>
                    <Card variant="feature" className="h-full p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-soft)]">
                        {metric.label}
                      </p>
                      <div className="mt-3 flex items-end gap-1">
                        <AnimatedCounter value={metric.value} className="text-3xl font-black text-[var(--ds-text)]" />
                        {metric.suffix ? <span className="pb-1 text-base font-bold text-[var(--ds-primary)]">{metric.suffix}</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-[var(--ds-text-muted)]">{metric.description}</p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <ParallaxLayer speed={0.1}>
              <Reveal variant="scale">
                <Card variant="hero" className="relative overflow-hidden p-0">
                  <div className="ds-grid-bg relative overflow-hidden rounded-[28px] p-6 sm:p-7">
                    <div className="absolute inset-x-6 top-6 h-px bg-[linear-gradient(90deg,transparent,var(--ds-primary),transparent)]" aria-hidden="true" />
                    <div className="grid gap-4">
                      <Card variant="feature" className="bg-white/90">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--ds-text)]">واجهة متجر تبني الثقة</p>
                            <p className="mt-1 text-sm text-[var(--ds-text-muted)]">صور أوضح، Hero غني، وشراء أسرع.</p>
                          </div>
                          <span className="rounded-2xl bg-[var(--ds-primary-soft)] p-2 text-[var(--ds-primary)]">
                            <Store className="h-5 w-5" />
                          </span>
                        </div>
                      </Card>

                      <Card variant="metric" className="overflow-hidden">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ds-text-soft)]">رحلة تشغيل مختصرة</p>
                        <div className="mt-4 space-y-3">
                          {journey.map((item, index) => (
                            <div key={item.title} className="flex gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ds-primary)] text-sm font-bold text-white shadow-[var(--ds-glow-primary)]">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-[var(--ds-text)]">{item.title}</p>
                                <p className="text-sm text-[var(--ds-text-muted)]">{item.body}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Card variant="feature" className="bg-[linear-gradient(180deg,rgba(20,80,209,0.08),rgba(255,255,255,0.95))]">
                          <p className="text-sm font-semibold text-[var(--ds-text)]">تخصيص بصري</p>
                          <p className="mt-1 text-sm text-[var(--ds-text-muted)]">ألوان، شرائح Hero، وصفحات محتوى.</p>
                        </Card>
                        <Card variant="feature" className="bg-[linear-gradient(180deg,rgba(244,127,44,0.08),rgba(255,255,255,0.95))]">
                          <p className="text-sm font-semibold text-[var(--ds-text)]">إدارة عملية</p>
                          <p className="mt-1 text-sm text-[var(--ds-text-muted)]">لوحات بيانات ونماذج أوضح وفلاتر أسرع.</p>
                        </Card>
                      </div>
                    </div>
                  </div>
                </Card>
              </Reveal>
            </ParallaxLayer>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <span className="ds-pill text-xs font-semibold">
                <WandSparkles className="h-3.5 w-3.5" />
                لماذا يختلف متجري عن الواجهة التقليدية؟
              </span>
              <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)]">أساس بصري واحد لكل نقاط التواصل</h2>
              <p className="max-w-2xl text-sm text-[var(--ds-text-muted)] sm:text-base">
                المنصة، المتجر، ولوحة التحكم تتحدث بنفس اللغة البصرية بدل أن تبدو كأجزاء منفصلة.
              </p>
            </div>
            <Link href="/features">
              <Button variant="secondary">عرض كل المميزات</Button>
            </Link>
          </div>
        </Reveal>

        <StaggerGroup className="grid gap-4 md:grid-cols-3">
          {highlights.map((feature) => (
            <Card key={feature.title} variant="feature" className="motion-card-hover-strong h-full">
              <div className="mb-4 inline-flex rounded-2xl bg-[var(--ds-primary-soft)] p-3 text-[var(--ds-primary)] shadow-[var(--ds-glow-primary)]">
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[var(--ds-text)]">{feature.title}</h3>
              <p className="text-sm leading-7 text-[var(--ds-text-muted)]">{feature.description}</p>
            </Card>
          ))}
        </StaggerGroup>
      </section>
    </div>
  )
}

