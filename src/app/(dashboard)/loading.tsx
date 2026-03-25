export default function DashboardLoading() {
  return (
    <div className="app-shell-gradient flex min-h-screen items-center justify-center px-4">
      <div className="surface-panel-elevated w-full max-w-sm px-6 py-10 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[var(--ds-primary)]/25 border-t-[var(--ds-primary)]" />
        <p className="text-sm text-[var(--ds-text-muted)]">جاري التحميل...</p>
      </div>
    </div>
  )
}
