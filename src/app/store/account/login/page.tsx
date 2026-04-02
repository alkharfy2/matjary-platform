'use client'

import { PhoneLoginForm } from './_components/phone-login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="surface-panel-elevated rounded-[28px] p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="ds-heading text-2xl font-black text-[var(--ds-text)]">
              تسجيل الدخول
            </h1>
            <p className="mt-2 text-sm text-[var(--ds-text-muted)]">
              أدخل رقم هاتفك وسنرسل لك رمز تحقق
            </p>
          </div>
          <PhoneLoginForm />
        </div>
      </div>
    </div>
  )
}
