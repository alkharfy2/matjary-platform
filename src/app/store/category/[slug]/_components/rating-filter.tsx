'use client'

import { Star } from 'lucide-react'

type RatingFilterProps = {
  value?: number
  onChange: (rating: number | undefined) => void
}

const RATINGS = [4, 3, 2, 1] as const

export function RatingFilter({ value, onChange }: RatingFilterProps) {
  return (
    <div className="space-y-2">
      {RATINGS.map((rating) => (
        <label key={rating} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="radio"
            name="rating-filter"
            checked={value === rating}
            onChange={() => onChange(value === rating ? undefined : rating)}
            className="h-4 w-4 accent-[var(--color-primary,#000)]"
          />
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
              />
            ))}
          </span>
          <span className="text-xs text-[var(--ds-text-muted)]">وأكثر</span>
        </label>
      ))}

      {value && (
        <button
          onClick={() => onChange(undefined)}
          className="text-xs text-[var(--ds-text-muted)] underline hover:text-[var(--ds-text)]"
        >
          إلغاء فلتر التقييم
        </button>
      )}
    </div>
  )
}
