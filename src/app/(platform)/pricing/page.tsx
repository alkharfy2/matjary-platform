import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { Reveal, StaggerGroup } from '@/components/motion'
import {
  getPublicPlatformPlans,
  type PublicPlatformPlan,
} from '@/lib/queries/platform-plans'

function formatPlanPrice(value: string) {
  const amount = Number.parseFloat(value)
  if (Number.isNaN(amount)) return value

  return amount.toLocaleString('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })
}

function getPlanDescription(plan: PublicPlatformPlan) {
  const monthlyPrice = Number.parseFloat(plan.priceMonthly)
  const orderFee = Number.parseFloat(plan.orderFee ?? '0')

  if (monthlyPrice === 0) {
    return 'للتجربة وإطلاق أول نسخة من المتجر'
  }

  if (plan.maxProducts === null) {
    return 'للمتاجر التي تريد مساحة أكبر للتوسع'
  }

  if (orderFee === 0) {
    return 'أفضل توازن بين الانطلاق والنمو'
  }

  return 'خطة شهرية مناسبة لتوسيع البيع بخطوات واضحة'
}

function getPlanCta(plan: PublicPlatformPlan) {
  return Number.parseFloat(plan.priceMonthly) === 0 ? 'ابدأ مجانًا' : 'اشترك الآن'
}

function getPlanFeatures(plan: PublicPlatformPlan) {
  const generatedFeatures = [
    plan.maxProducts === null
      ? 'منتجات غير محدودة'
      : `حتى ${plan.maxProducts.toLocaleString('ar-EG')} منتج`,
    plan.maxOrdersPerMonth === null
      ? 'طلبات غير محدودة'
      : `حتى ${plan.maxOrdersPerMonth.toLocaleString('ar-EG')} طلب شهريًا`,
    plan.orderFee && Number.parseFloat(plan.orderFee) > 0
      ? `رسوم ${formatPlanPrice(plan.orderFee)} جنيه لكل طلب`
      : 'بدون عمولة على الطلبات',
  ]

  const uniqueFeatures = new Set<string>()

  for (const feature of [...generatedFeatures, ...plan.features]) {
    const normalizedFeature = feature.trim()
    if (normalizedFeature) {
      uniqueFeatures.add(normalizedFeature)
    }
  }

  return [...uniqueFeatures]
}

export default async function PricingPage() {
  let plans: PublicPlatformPlan[] = []

  try {
    plans = await getPublicPlatformPlans()
  } catch (error) {
    console.error('Pricing page plan lookup failed:', error)
  }

  const mostPopularPlanId = plans.find((plan) => plan.isMostPopular)?.id ?? null

  const highlightedPlanId =
    mostPopularPlanId ??
    plans.find((plan) => plan.id === 'basic')?.id ??
    plans[1]?.id ??
    null

  return (
    <div className="ds-section-stack">
      <section className="ds-hero-panel px-6 py-10 text-center sm:px-8">
        <Reveal className="space-y-4">
          <span className="ds-pill mx-auto text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            خطط واضحة لمرحلة نمو متجرك
          </span>
          <h1 className="ds-heading text-4xl font-black text-[var(--ds-text)] sm:text-5xl">اختر الخطة التي تناسب مرحلة البيع الحالية</h1>
          <p className="mx-auto max-w-3xl text-sm leading-8 text-[var(--ds-text-muted)] sm:text-base">
            صممنا الخطط لتبدأ بسرعة ثم تتوسع دون إعادة بناء متجرك أو تغيير تجربة عملائك.
          </p>
        </Reveal>
      </section>

      {plans.length === 0 ? (
        <Card variant="feature" className="mx-auto max-w-2xl text-center">
          <p className="text-sm leading-7 text-[var(--ds-text-muted)]">
            لا توجد خطط مفعلة للعرض حاليًا. أضف خططًا من لوحة المشرف لتظهر هنا.
          </p>
        </Card>
      ) : (
        <StaggerGroup className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3" stagger={120}>
          {plans.map((plan) => {
            const highlighted = plan.id === highlightedPlanId
            const features = getPlanFeatures(plan)

            return (
              <Card
                key={plan.id}
                variant={highlighted ? 'hero' : 'feature'}
                className={
                  highlighted
                    ? 'relative h-full min-h-[28rem] min-w-0 border-[var(--ds-primary)]/20 pt-10 motion-card-hover-strong sm:min-h-[30rem] sm:pt-11'
                    : 'relative h-full min-h-[28rem] min-w-0 motion-card-hover sm:min-h-[30rem]'
                }
              >
                {plan.id === mostPopularPlanId ? (
                  <span className="absolute right-5 top-4 rounded-full bg-[linear-gradient(135deg,var(--ds-primary),color-mix(in_oklab,var(--ds-primary)_65%,var(--ds-accent)))] px-4 py-1 text-xs font-bold text-white shadow-[var(--ds-glow-primary)]">
                    الأكثر طلبًا
                  </span>
                ) : null}

                <div className="flex h-full min-w-0 flex-col gap-4">
                  <div className="min-w-0">
                    <h2 className="break-words [overflow-wrap:anywhere] text-2xl font-black text-[var(--ds-text)]">{plan.name}</h2>
                    <p className="mt-2 break-words text-sm text-[var(--ds-text-muted)] [overflow-wrap:anywhere]">
                      {getPlanDescription(plan)}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[var(--ds-border)] bg-white/80 px-5 py-5 shadow-[var(--ds-shadow-sm)]">
                    <div className="flex items-end justify-center gap-2">
                      <span className="text-5xl font-black text-[var(--ds-text)]">{formatPlanPrice(plan.priceMonthly)}</span>
                      <span className="pb-2 text-sm text-[var(--ds-text-muted)]">
                        جنيه{Number.parseFloat(plan.priceMonthly) === 0 ? '' : '/شهر'}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 min-w-0 space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex min-w-0 items-start gap-2 text-sm text-[var(--ds-text-muted)]">
                        <span className="mt-0.5 shrink-0 rounded-full bg-emerald-50 p-1 text-emerald-600">
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="min-w-0 break-words leading-7 [overflow-wrap:anywhere]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/sign-up" className="mt-auto block">
                    <Button
                      variant={highlighted ? 'primary' : 'secondary'}
                      glow={highlighted}
                      className={
                        highlighted
                          ? 'h-12 w-full rounded-2xl text-base font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.3)]'
                          : 'h-12 w-full rounded-2xl text-base font-semibold'
                      }
                    >
                      {getPlanCta(plan)}
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </StaggerGroup>
      )}
    </div>
  )
}
