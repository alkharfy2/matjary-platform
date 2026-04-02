'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2 text-[var(--ds-text)]">لا يوجد اتصال بالإنترنت</h1>
      <p className="text-[var(--ds-text-muted)] mb-4">
        تأكد من اتصالك بالإنترنت وأعد المحاولة
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-[var(--color-primary,#111)] px-6 py-2 text-[var(--color-primary-contrast,#fff)]"
      >
        إعادة المحاولة
      </button>
    </div>
  )
}
