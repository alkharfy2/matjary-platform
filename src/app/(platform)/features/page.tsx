import { CreditCard, FileText, Layers, LayoutDashboard, ShoppingCart, TicketPercent, Truck, WandSparkles } from 'lucide-react'
import { Card } from '@/components/ui'
import { FloatingAccent, Reveal, StaggerGroup } from '@/components/motion'

export default function FeaturesPage() {
  const features = [
    {
      title: 'واجهة متجر حديثة',
      description: 'Hero متجاوب، بطاقات منتجات أوضح، وسلة وcheckout يعززان الثقة والتحويل.',
      icon: <ShoppingCart className="h-5 w-5" />,
    },
    {
      title: 'لوحة تحكم متكاملة',
      description: 'إدارة المنتجات والطلبات والعملاء والصفحات والتصميم من مكان واحد.',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      title: 'دفع مرن',
      description: 'تشغيل الدفع الإلكتروني أو COD حسب طبيعة متجرك وسوقك المستهدف.',
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: 'عروض وكوبونات',
      description: 'إنشاء خصومات قابلة للإدارة مع حدود استخدام ورسائل أوضح داخل رحلة الشراء.',
      icon: <TicketPercent className="h-5 w-5" />,
    },
    {
      title: 'شحن ومناطق تسليم',
      description: 'ربط تكلفة الشحن بالمحافظة والمناطق مع إظهار الحالة بوضوح في checkout.',
      icon: <Truck className="h-5 w-5" />,
    },
    {
      title: 'صفحات محتوى ديناميكية',
      description: 'بناء صفحات من نحن، الأسئلة الشائعة، والصفحات التسويقية من نفس النظام.',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: 'طبقة UI قابلة للتوسع',
      description: 'مكونات مشتركة تسمح برفع جودة الشكل العام بدون إعادة كتابة المشروع بالكامل.',
      icon: <Layers className="h-5 w-5" />,
    },
    {
      title: 'تخصيص بصري أسهل',
      description: 'ألوان، هيدر، شرائح Hero، ومعاينة مرئية أقرب للنتيجة النهائية.',
      icon: <WandSparkles className="h-5 w-5" />,
    },
  ]

  return (
    <div className="ds-section-stack">
      <section className="relative overflow-hidden ds-hero-panel px-6 py-10 sm:px-8">
        <FloatingAccent tone="primary" size="md" className="-right-8 top-8" />
        <Reveal className="relative space-y-4 text-center">
          <span className="ds-pill mx-auto text-xs font-semibold">قدرات المنصة الأساسية</span>
          <h1 className="ds-heading text-4xl font-black text-[var(--ds-text)] sm:text-5xl">كل ما تحتاجه لتبدو علامتك أقوى وتبيع أسرع</h1>
          <p className="mx-auto max-w-3xl text-sm leading-8 text-[var(--ds-text-muted)] sm:text-base">
            المميزات هنا ليست مجرد قائمة وظائف، بل نظام مترابط يغطي الهوية البصرية، إدارة التشغيل،
            وتحسين التحويل داخل المتجر من الزيارة الأولى وحتى تأكيد الطلب.
          </p>
        </Reveal>
      </section>

      <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title} variant="feature" className="motion-card-hover-strong h-full">
            <div className="mb-4 inline-flex rounded-2xl bg-[var(--ds-primary-soft)] p-3 text-[var(--ds-primary)] shadow-[var(--ds-glow-primary)]">
              {feature.icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--ds-text)]">{feature.title}</h3>
            <p className="text-sm leading-7 text-[var(--ds-text-muted)]">{feature.description}</p>
          </Card>
        ))}
      </StaggerGroup>
    </div>
  )
}
