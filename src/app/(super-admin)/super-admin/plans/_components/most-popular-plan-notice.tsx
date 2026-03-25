'use client'

type MostPopularPlanSummary = {
  id: string
  name: string
  priceMonthly: string
  maxProducts: number | null
  maxOrdersPerMonth: number | null
}

type MostPopularPlanNoticeProps = {
  currentMostPopularPlan: MostPopularPlanSummary | null
  targetPlanId?: string | null
  targetPlanName: string
  nextIsMostPopular: boolean
}

function formatPlanPrice(value: string) {
  const amount = Number.parseFloat(value)

  if (Number.isNaN(amount) || amount === 0) {
    return 'مجاني'
  }

  return `${amount.toLocaleString('ar-EG')} ج.م / شهر`
}

function getPlanLimitLabel(value: number | null, suffix: string) {
  if (value === null) {
    return `غير محدود${suffix}`
  }

  return `${value.toLocaleString('ar-EG')} ${suffix}`
}

export function MostPopularPlanNotice({
  currentMostPopularPlan,
  targetPlanId,
  targetPlanName,
  nextIsMostPopular,
}: MostPopularPlanNoticeProps) {
  const trimmedTargetPlanName = targetPlanName.trim() || 'هذه الخطة'
  const isCurrentPlanMostPopular = currentMostPopularPlan?.id === targetPlanId

  let noticeToneClass = 'border-[var(--ds-border)] bg-[var(--ds-surface-muted)] text-[var(--ds-text-muted)]'
  let noticeMessage = 'فعّل هذا الخيار إذا كنت تريد إبراز هذه الخطة في صفحة الأسعار.'

  if (nextIsMostPopular && currentMostPopularPlan && !isCurrentPlanMostPopular) {
    noticeToneClass = 'border-amber-200 bg-amber-50 text-amber-800'
    noticeMessage = `عند الحفظ ستصبح خطة ${trimmedTargetPlanName} هي الخطة الأكثر طلبًا بدلًا من خطة ${currentMostPopularPlan.name}.`
  } else if (nextIsMostPopular && isCurrentPlanMostPopular) {
    noticeToneClass = 'border-emerald-200 bg-emerald-50 text-emerald-700'
    noticeMessage = 'هذه الخطة هي المحددة حاليًا كخطة الأكثر طلبًا.'
  } else if (nextIsMostPopular && !currentMostPopularPlan) {
    noticeToneClass = 'border-emerald-200 bg-emerald-50 text-emerald-700'
    noticeMessage = `لا توجد خطة محددة حاليًا، وعند الحفظ ستصبح ${trimmedTargetPlanName} هي الخطة الأكثر طلبًا.`
  } else if (!nextIsMostPopular && isCurrentPlanMostPopular) {
    noticeToneClass = 'border-amber-200 bg-amber-50 text-amber-800'
    noticeMessage = 'عند الحفظ ستُزال علامة الأكثر طلبًا من هذه الخطة، ولن تبقى أي خطة مميزة حتى تختار خطة أخرى.'
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-xl border px-4 py-3 text-sm leading-7 ${noticeToneClass}`}>
        {noticeMessage}
      </div>

      {currentMostPopularPlan ? (
        <div className="rounded-xl border border-[var(--ds-border)] bg-white/80 px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--ds-text)]">الخطة الأكثر طلبًا الحالية</p>
          <div className="mt-2 space-y-1 text-[var(--ds-text-muted)]">
            <p>
              <span className="text-[var(--ds-text)]">الاسم:</span> {currentMostPopularPlan.name}
            </p>
            <p>
              <span className="text-[var(--ds-text)]">السعر:</span> {formatPlanPrice(currentMostPopularPlan.priceMonthly)}
            </p>
            <p>
              <span className="text-[var(--ds-text)]">المنتجات:</span>{' '}
              {getPlanLimitLabel(currentMostPopularPlan.maxProducts, 'منتج')}
            </p>
            <p>
              <span className="text-[var(--ds-text)]">الطلبات:</span>{' '}
              {getPlanLimitLabel(currentMostPopularPlan.maxOrdersPerMonth, 'طلب/شهر')}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--ds-border)] px-4 py-3 text-sm text-[var(--ds-text-muted)]">
          لا توجد خطة محددة حاليًا كخطة الأكثر طلبًا.
        </div>
      )}
    </div>
  )
}
