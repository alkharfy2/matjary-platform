'use client'

import { useState, useEffect } from 'react'

type PriceRangeSliderProps = {
  minPrice?: number
  maxPrice?: number
  currency: string
  onChange: (min: number | undefined, max: number | undefined) => void
}

export function PriceRangeSlider({ minPrice, maxPrice, currency, onChange }: PriceRangeSliderProps) {
  const [min, setMin] = useState(minPrice?.toString() ?? '')
  const [max, setMax] = useState(maxPrice?.toString() ?? '')

  useEffect(() => {
    setMin(minPrice?.toString() ?? '')
    setMax(maxPrice?.toString() ?? '')
  }, [minPrice, maxPrice])

  const handleMinBlur = () => {
    const val = Number(min)
    onChange(val > 0 ? val : undefined, maxPrice)
  }

  const handleMaxBlur = () => {
    const val = Number(max)
    onChange(minPrice, val > 0 ? val : undefined)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="من"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={handleMinBlur}
          min={0}
          className="w-full rounded-lg border border-[var(--ds-divider)] bg-transparent px-3 py-2 text-center text-sm text-[var(--ds-text)] outline-none focus:border-[var(--color-primary,#000)]"
        />
      </div>
      <span className="text-xs text-[var(--ds-text-muted)]">—</span>
      <div className="flex-1">
        <input
          type="number"
          inputMode="numeric"
          placeholder="إلى"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={handleMaxBlur}
          min={0}
          className="w-full rounded-lg border border-[var(--ds-divider)] bg-transparent px-3 py-2 text-center text-sm text-[var(--ds-text)] outline-none focus:border-[var(--color-primary,#000)]"
        />
      </div>
      <span className="text-xs text-[var(--ds-text-muted)]">{currency}</span>
    </div>
  )
}
