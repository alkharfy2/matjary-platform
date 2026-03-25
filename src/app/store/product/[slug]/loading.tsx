export default function ProductPageLoading() {
  return (
    <div dir="rtl" className="mx-auto max-w-[1280px] px-4 py-8">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-[var(--ds-surface-muted)]" />

          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-lg bg-[color:color-mix(in_oklab,var(--ds-surface-muted)_72%,var(--ds-surface-elevated))]"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[var(--ds-surface-muted)]" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--ds-surface-glass)]" />
          </div>

          <div className="flex items-baseline gap-3">
            <div className="h-9 w-32 animate-pulse rounded-lg bg-[var(--ds-surface-muted)]" />
            <div className="h-6 w-20 animate-pulse rounded-lg bg-[var(--ds-surface-glass)]" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-[var(--ds-surface-glass)]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--ds-surface-glass)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--ds-surface-glass)]" />
          </div>

          <hr className="border-[var(--ds-divider)]" />

          <div className="space-y-3">
            <div className="h-4 w-16 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-20 animate-pulse rounded-full bg-[var(--ds-surface-muted)]"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 w-14 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
            <div className="h-11 w-36 animate-pulse rounded-xl bg-[var(--ds-surface-muted)]" />
          </div>

          <div className="pt-2">
            <div className="h-14 w-full animate-pulse rounded-xl bg-[var(--ds-surface-muted)]" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-xl border border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)] p-6"
              >
                <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--ds-surface-muted)]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                <div className="h-3 w-32 animate-pulse rounded bg-[var(--ds-surface-glass)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-6 h-7 w-40 animate-pulse rounded-lg bg-[var(--ds-surface-muted)]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-[var(--ds-divider)] bg-[var(--ds-surface-elevated)]"
            >
              <div className="aspect-square w-full animate-pulse bg-[var(--ds-surface-muted)]" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--ds-surface-muted)]" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--ds-surface-glass)]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
