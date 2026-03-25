'use client'

import { useState } from 'react'
import { z } from 'zod'

const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'الاسم مطلوب (حرفين على الأقل)')
    .max(100, 'الاسم طويل جدًا'),
  phone: z
    .string()
    .min(10, 'رقم الهاتف غير صالح')
    .max(20, 'رقم الهاتف طويل جدًا'),
  message: z
    .string()
    .min(5, 'الرسالة قصيرة جدًا')
    .max(1000, 'الرسالة طويلة جدًا'),
})

type ContactFormData = z.infer<typeof contactFormSchema>

type PageFormProps = {
  title?: string
  description?: string
}

type FormStatus = 'idle' | 'loading' | 'success'

export function PageForm({ title, description }: PageFormProps) {
  const [form, setForm] = useState<ContactFormData>({
    name: '',
    phone: '',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<FormStatus>('idle')

  function updateField(field: keyof ContactFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setErrors({})

    const result = contactFormSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0]
        if (typeof field === 'string') {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setStatus('loading')
    window.setTimeout(() => {
      setStatus('success')
      setForm({ name: '', phone: '', message: '' })
    }, 600)
  }

  const fieldClasses = (hasError: boolean) =>
    `w-full rounded-[18px] border bg-[var(--ds-surface-glass)] px-4 py-3 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[var(--ds-surface-elevated)] ${
      hasError
        ? 'border-[var(--ds-danger)] focus:ring-[color:color-mix(in_oklab,var(--ds-danger)_24%,transparent)]'
        : 'border-[var(--ds-divider)] focus:ring-[color:color-mix(in_oklab,var(--color-primary,#111827)_20%,transparent)] hover:border-[var(--ds-border-strong)]'
    }`

  return (
    <section className="mb-8">
      <div className="surface-panel-elevated mx-auto max-w-2xl px-6 py-6 md:px-8 md:py-8">
        <div className="mb-6 text-center">
          <span className="ds-pill mb-4 text-xs font-semibold text-[var(--ds-text)]">
            تواصل مباشر
          </span>
          <h2 className="ds-heading text-3xl font-black text-[var(--ds-text)]">
            {title || 'تواصل معنا'}
          </h2>
          {description ? (
            <p className="mt-3 text-sm leading-7 text-[var(--ds-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>

        {status === 'success' ? (
          <div
            className="flex flex-col items-center gap-3 rounded-[24px] border p-8 text-center shadow-[var(--ds-shadow-sm)]"
            style={{
              borderColor: 'color-mix(in oklab, var(--ds-success) 24%, transparent)',
              background: 'linear-gradient(180deg, color-mix(in oklab, var(--ds-success) 10%, var(--ds-surface-elevated)), var(--ds-surface-elevated))',
            }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--ds-shadow-sm)]"
              style={{
                backgroundColor: 'color-mix(in oklab, var(--ds-success) 16%, var(--ds-surface-elevated))',
                color: 'var(--ds-success)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[var(--ds-success)]">
              تم إرسال رسالتك بنجاح
            </p>
            <p className="text-sm text-[var(--ds-text-muted)]">
              سنتواصل معك في أقرب وقت
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-3 text-sm font-semibold underline underline-offset-4 transition-colors"
              style={{ color: 'var(--ds-success)' }}
            >
              إرسال رسالة أخرى
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                الاسم <span className="text-[var(--ds-danger)]">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className={fieldClasses(!!errors.name)}
                placeholder="مثال: أحمد محمد"
              />
              {errors.name ? <p className="mt-1 text-xs text-[var(--ds-danger)]">{errors.name}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                رقم الهاتف <span className="text-[var(--ds-danger)]">*</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                className={fieldClasses(!!errors.phone)}
                placeholder="01xxxxxxxxx"
              />
              {errors.phone ? <p className="mt-1 text-xs text-[var(--ds-danger)]">{errors.phone}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--ds-text)]">
                الرسالة <span className="text-[var(--ds-danger)]">*</span>
              </label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                className={fieldClasses(!!errors.message)}
                placeholder="اكتب رسالتك هنا..."
              />
              {errors.message ? <p className="mt-1 text-xs text-[var(--ds-danger)]">{errors.message}</p> : null}
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-base font-semibold text-white shadow-[var(--button-glow,0_18px_38px_rgba(15,23,42,0.14))] transition-all hover:-translate-y-0.5 hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-primary, #000)' }}
            >
              {status === 'loading' ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
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
                  جارٍ الإرسال...
                </>
              ) : (
                'إرسال'
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
