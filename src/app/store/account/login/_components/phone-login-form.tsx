'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/tenant/store-context'
import { storePath } from '@/lib/tenant/store-path'
import { Phone, ArrowLeft, Loader2 } from 'lucide-react'
import { getFirebaseAuth } from '@/lib/firebase/config'
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'

type Step = 'phone' | 'otp' | 'name'

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('2')) return `+${digits}`
  if (digits.startsWith('0')) return `+2${digits}`
  return `+2${digits}`
}

export function PhoneLoginForm() {
  const store = useStore()
  const router = useRouter()

  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isNewAccount, setIsNewAccount] = useState(false)

  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const recaptchaRef = useRef<HTMLDivElement | null>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const confirmationRef = useRef<ConfirmationResult | null>(null)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Initialize reCAPTCHA verifier
  const getRecaptchaVerifier = useCallback(() => {
    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current

    const auth = getFirebaseAuth()
    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current!, {
      size: 'invisible',
    })
    return recaptchaVerifierRef.current
  }, [])

  const handleSendOtp = useCallback(async () => {
    setError('')
    const trimmedPhone = phone.trim()

    if (!/^(?:\+?2)?01[0-25]\d{8}$/.test(trimmedPhone)) {
      setError('رقم الهاتف غير صحيح')
      return
    }

    setLoading(true)
    try {
      const auth = getFirebaseAuth()
      const verifier = getRecaptchaVerifier()
      const e164Phone = toE164(trimmedPhone)

      const confirmation = await signInWithPhoneNumber(auth, e164Phone, verifier)
      confirmationRef.current = confirmation

      setStep('otp')
      setCooldown(60)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err: unknown) {
      // Reset reCAPTCHA on error so it can be retried
      recaptchaVerifierRef.current = null
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/too-many-requests') {
        setError('محاولات كثيرة. يرجى المحاولة لاحقاً')
      } else if (firebaseError.code === 'auth/invalid-phone-number') {
        setError('رقم الهاتف غير صحيح')
      } else {
        setError('حدث خطأ أثناء إرسال الرمز')
      }
    } finally {
      setLoading(false)
    }
  }, [phone, getRecaptchaVerifier])

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return

      const newOtp = [...otp]
      newOtp[index] = value.slice(-1)
      setOtp(newOtp)

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus()
      }
    },
    [otp]
  )

  const handleOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus()
      }
    },
    [otp]
  )

  const handleVerifyOtp = useCallback(async () => {
    setError('')
    const code = otp.join('')
    if (code.length !== 6) {
      setError('أدخل الرمز المكون من 6 أرقام')
      return
    }

    if (!confirmationRef.current) {
      setError('يرجى إعادة إرسال الرمز')
      return
    }

    setLoading(true)
    try {
      // Verify OTP with Firebase
      const credential = await confirmationRef.current.confirm(code)
      const idToken = await credential.user.getIdToken()

      // Send Firebase token to our API to create session
      const res = await fetch('/api/storefront/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), firebaseToken: idToken }),
      })
      const data = await res.json()

      if (data?.success) {
        if (data.data?.isNew) {
          setIsNewAccount(true)
          setStep('name')
        } else {
          router.replace(storePath('/account', { storeSlug: store.slug }))
        }
      } else {
        setError(data?.error?.message ?? 'حدث خطأ في تسجيل الدخول')
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/invalid-verification-code') {
        setError('الرمز غير صحيح')
      } else if (firebaseError.code === 'auth/code-expired') {
        setError('انتهت صلاحية الرمز. أعد الإرسال')
      } else {
        setError('حدث خطأ أثناء التحقق')
      }
    } finally {
      setLoading(false)
    }
  }, [otp, phone, router, store.slug])

  const handleSaveName = useCallback(async () => {
    setError('')
    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('الاسم يجب أن يكون حرفين على الأقل')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/storefront/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      })
      const data = await res.json()

      if (data?.success) {
        router.replace(storePath('/account', { storeSlug: store.slug }))
      } else {
        setError(data?.error?.message ?? 'حدث خطأ أثناء حفظ الاسم')
      }
    } catch {
      setError('تعذر الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }, [name, router, store.slug])

  const handleOtpPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = [...Array(6)].map((_, i) => pasted[i] || '')
    setOtp(newOtp)
    const nextEmpty = newOtp.findIndex((v) => !v)
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()
  }, [])

  return (
    <div className="space-y-6">
      {/* Invisible reCAPTCHA container */}
      <div ref={recaptchaRef} id="recaptcha-container" />

      {step !== 'phone' && (
        <button
          onClick={() => {
            if (step === 'otp') { setStep('phone'); setOtp(['', '', '', '', '', '']) }
            else if (step === 'name') { setStep('otp') }
            setError('')
          }}
          className="flex items-center gap-1 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          رجوع
        </button>
      )}

      {/* Phone Step */}
      {step === 'phone' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--ds-text)]">رقم الهاتف</label>
            <div className="relative">
              <Phone className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ds-text-soft)]" />
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                placeholder="01xxxxxxxxx"
                className="w-full rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] py-3 pe-4 ps-11 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35 hover:border-[var(--ds-border-strong)]"
              />
            </div>
          </div>

          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[20px] py-3.5 text-sm font-semibold text-white shadow-[var(--button-glow)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            إرسال رمز التحقق
          </button>
        </div>
      )}

      {/* OTP Step */}
      {step === 'otp' && (
        <div className="space-y-4">
          <p className="text-center text-sm text-[var(--ds-text-muted)]">
            أدخل الرمز المرسل إلى <span dir="ltr" className="font-semibold">{phone}</span>
          </p>

          <div className="flex justify-center gap-2" dir="ltr" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] text-center text-lg font-bold text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35 sm:h-14 sm:w-12"
              />
            ))}
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.join('').length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-[20px] py-3.5 text-sm font-semibold text-white shadow-[var(--button-glow)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            تحقق
          </button>

          <div className="text-center">
            {cooldown > 0 ? (
              <p className="text-xs text-[var(--ds-text-soft)]">
                إعادة الإرسال بعد {cooldown} ثانية
              </p>
            ) : (
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="text-xs font-medium text-[var(--color-primary,#000)] hover:underline disabled:opacity-50"
              >
                إعادة إرسال الرمز
              </button>
            )}
          </div>
        </div>
      )}

      {/* Name Step (new accounts) */}
      {step === 'name' && isNewAccount && (
        <div className="space-y-4">
          <p className="text-center text-sm text-[var(--ds-text-muted)]">
            مرحباً بك! أدخل اسمك لإكمال التسجيل
          </p>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--ds-text)]">الاسم</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              placeholder="اسمك الكامل"
              className="w-full rounded-[18px] border border-[var(--ds-border)] bg-[var(--ds-surface-glass)] px-4 py-3 text-sm text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#000)]/35 hover:border-[var(--ds-border-strong)]"
            />
          </div>

          <button
            onClick={handleSaveName}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-[20px] py-3.5 text-sm font-semibold text-white shadow-[var(--button-glow)] transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-primary, #000)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ والمتابعة
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-[var(--ds-danger)]/20 bg-[var(--ds-danger)]/5 px-4 py-2 text-center text-sm text-[var(--ds-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
