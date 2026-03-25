import { SignIn } from '@clerk/nextjs'
import { ThemeToggle } from '@/components/theme'
import { FloatingAccent, Reveal } from '@/components/motion'

export default function SignInPage() {
  return (
    <main className="app-shell-gradient relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle compact />
      </div>
      <FloatingAccent tone="primary" size="lg" className="-right-14 top-10" />
      <FloatingAccent tone="accent" size="md" className="-left-8 bottom-10" />

      <div className="grid w-full max-w-[1120px] overflow-hidden rounded-[32px] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] shadow-[var(--ds-shadow-lg)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal className="relative hidden overflow-hidden bg-[linear-gradient(160deg,var(--ds-primary),color-mix(in_oklab,var(--ds-primary)_55%,var(--ds-accent)))] p-10 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%)]" />
          <div className="relative space-y-6">
            <span className="ds-pill w-fit border-white/20 bg-white/12 text-white/95">جاهز للعودة إلى التشغيل؟</span>
            <div className="space-y-4">
              <h1 className="ds-heading text-4xl font-black leading-tight">مرحبًا بعودتك إلى متجري</h1>
              <p className="max-w-md text-sm leading-8 text-white/90">
                ادخل إلى لوحة تحكم أكثر وضوحًا، تابع طلباتك، وحرّك متجرك للأمام من تجربة موحدة ومصقولة.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="glass-panel rounded-[24px] border-white/55 bg-white/90 p-4 text-[var(--ds-text)]">
                <p className="text-sm font-semibold">تشغيل أسرع</p>
                <p className="mt-1 text-sm text-[var(--ds-text-muted)]">الوصول للطلبات والمنتجات والإعدادات من لحظة تسجيل الدخول.</p>
              </div>
              <div className="glass-panel rounded-[24px] border-white/55 bg-white/90 p-4 text-[var(--ds-text)]">
                <p className="text-sm font-semibold">واجهة أكثر أناقة</p>
                <p className="mt-1 text-sm text-[var(--ds-text-muted)]">تجربة عربية واضحة تربط المنصة والمتجر ولوحة التحكم.</p>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120} className="p-4 sm:p-8 lg:p-10">
          <div className="rounded-[28px] border border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] p-3 shadow-[var(--ds-shadow-sm)] sm:p-5">
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'mx-auto w-full',
                  card: 'shadow-none border-0 w-full bg-transparent',
                  headerTitle: 'text-right text-[var(--ds-text)] font-black',
                  headerSubtitle: 'text-right text-[var(--ds-text-muted)]',
                  formButtonPrimary:
                    'bg-[linear-gradient(135deg,var(--ds-primary),color-mix(in_oklab,var(--ds-primary)_70%,var(--ds-accent)))] hover:brightness-105 shadow-[var(--ds-glow-primary)] text-[var(--ds-primary-contrast)]',
                  socialButtonsBlockButton:
                    'border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] hover:bg-[var(--ds-hover)] text-[var(--ds-text)]',
                  formFieldInput:
                    'rounded-[16px] border border-[var(--ds-divider)] bg-[var(--ds-surface-glass)] text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)]',
                  dividerLine: 'bg-[var(--ds-divider)]',
                  dividerText: 'text-[var(--ds-text-soft)]',
                  formFieldLabel: 'text-[var(--ds-text)]',
                  footerActionText: 'text-[var(--ds-text-muted)]',
                  footerActionLink: 'text-[var(--ds-primary)]',
                },
              }}
            />
          </div>
        </Reveal>
      </div>
    </main>
  )
}
