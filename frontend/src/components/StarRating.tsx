import { Star } from 'lucide-react'
import { useState } from 'react'

/** Half-star rating (0.5–5). Click the left/right half of a star; click the current value again to clear. */
export function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = shown >= n ? 1 : shown >= n - 0.5 ? 0.5 : 0
          return (
            <span key={n} className="relative h-8 w-8">
              <Star className="absolute inset-0 m-auto h-7 w-7 text-line" strokeWidth={1.5} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className="absolute left-0 top-0 m-0.5 h-7 w-7 fill-amber-300 text-amber-300" strokeWidth={1.5} />
              </span>
              {[n - 0.5, n].map((v, i) => (
                <button
                  key={v}
                  type="button"
                  aria-label={`${v} stars`}
                  className={`absolute top-0 h-full w-1/2 ${i === 0 ? 'left-0' : 'right-0'}`}
                  onMouseEnter={() => setHover(v)}
                  onClick={() => onChange(value === v ? null : v)}
                />
              ))}
            </span>
          )
        })}
      </div>
      <span className="w-14 text-sm tabular-nums text-muted">{shown ? `${shown.toFixed(1)}★` : 'No rating'}</span>
    </div>
  )
}
