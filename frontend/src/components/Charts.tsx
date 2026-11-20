import { useState, type ReactNode } from 'react'
import type { ActivityBucket } from '../lib/stats'
import type { MediaKind } from '../lib/types'

const kindSeries: { kind: MediaKind; label: string; fill: string }[] = [
  { kind: 'FILM', label: 'Films', fill: 'bg-chart-film' },
  { kind: 'ANIME', label: 'Anime', fill: 'bg-chart-anime' },
  { kind: 'GAME', label: 'Games', fill: 'bg-chart-game' },
]

export function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-2 px-3 py-2 text-xs shadow-xl ring-1 ring-line">
      {children}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {kindSeries.map((s) => (
        <span key={s.kind} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${s.fill}`} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

/** Stacked columns of finished titles per bucket, with a legend, hover tooltip and a table view. */
export function ActivityChart({ buckets }: { buckets: ActivityBucket[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...buckets.map((b) => b.total))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]

  if (buckets.every((b) => b.total === 0)) {
    return <Empty>Nothing finished with a date in this period yet.</Empty>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Legend />
        <button onClick={() => setTable((t) => !t)} className="rounded-full px-2.5 py-1 text-xs text-muted ring-1 ring-line transition hover:text-text">
          {table ? 'Chart' : 'Table'}
        </button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="py-1.5 font-medium">Period</th>
              {kindSeries.map((s) => (
                <th key={s.kind} className="py-1.5 text-right font-medium">{s.label}</th>
              ))}
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {buckets.map((b) => (
              <tr key={b.title} className="border-t border-line/60">
                <td className="py-1.5">{b.title}</td>
                {kindSeries.map((s) => (
                  <td key={s.kind} className="py-1.5 text-right text-muted">{b.counts[s.kind]}</td>
                ))}
                <td className="py-1.5 text-right font-medium">{b.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          {/* recessive gridlines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48">
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-line/50" style={{ bottom: `${(t / top) * 100}%` }}>
                <span className="absolute -top-2 left-0 text-[10px] text-muted/70">{t}</span>
              </div>
            ))}
          </div>
          <div className="flex h-48 items-end gap-1.5 pl-6 sm:gap-3">
            {buckets.map((b, i) => (
              <div
                key={b.title}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                {hover === i && b.total > 0 && (
                  <Tooltip>
                    <p className="font-medium text-text">{b.title}</p>
                    {kindSeries.map((s) =>
                      b.counts[s.kind] ? (
                        <p key={s.kind} className="mt-0.5 flex items-center gap-1.5 text-muted">
                          <span className={`h-2 w-2 rounded-sm ${s.fill}`} /> {s.label} <span className="ml-auto pl-3 text-text tabular-nums">{b.counts[s.kind]}</span>
                        </p>
                      ) : null,
                    )}
                  </Tooltip>
                )}
                <div
                  className={`flex w-full max-w-7 flex-col-reverse gap-[2px] transition-opacity ${hover != null && hover !== i ? 'opacity-50' : ''}`}
                  style={{ height: `${(b.total / top) * 100}%` }}
                >
                  {kindSeries.map((s) =>
                    b.counts[s.kind] ? (
                      <div key={s.kind} className={`${s.fill} min-h-[3px] last:rounded-t`} style={{ flexGrow: b.counts[s.kind] }} />
                    ) : null,
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5 pl-6 sm:gap-3">
            {buckets.map((b) => (
              <span key={b.title} className="flex-1 text-center text-[10px] text-muted sm:text-xs">{b.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Count of rated titles at each half-star step. */
export function RatingChart({ buckets, average }: { buckets: { rating: number; count: number }[]; average: number | null }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...buckets.map((b) => b.count))
  if (buckets.every((b) => b.count === 0)) return <Empty>No ratings in this period.</Empty>
  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {buckets.map((b, i) => (
          <div key={b.rating} className="relative flex h-full flex-1 flex-col items-center justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && (
              <Tooltip>
                <span className="text-text">{b.rating.toFixed(1)}★</span> <span className="text-muted">· {b.count} {b.count === 1 ? 'title' : 'titles'}</span>
              </Tooltip>
            )}
            {b.count > 0 && <span className="mb-1 text-[10px] tabular-nums text-muted">{b.count}</span>}
            <div
              className={`w-full max-w-6 rounded-t bg-chart-single transition-opacity ${hover != null && hover !== i ? 'opacity-50' : ''}`}
              style={{ height: `${(b.count / max) * 80}%`, minHeight: b.count ? 3 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-line/60 pt-1.5">
        {buckets.map((b) => (
          <span key={b.rating} className="flex-1 text-center text-[10px] text-muted">{Number.isInteger(b.rating) ? `${b.rating}★` : ''}</span>
        ))}
      </div>
      {average != null && <p className="mt-3 text-xs text-muted">Average <span className="font-medium text-text">{average.toFixed(2)}★</span></p>}
    </div>
  )
}

/** Horizontal bars with the value written at the end: genres, platforms. */
export function BarList({ rows, unit, empty }: { rows: { key: string; label: ReactNode; value: number; detail?: string }[]; unit?: string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <Empty>{empty}</Empty>
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="group" title={r.detail}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {r.value.toLocaleString()}
              {unit && <span className="text-muted/70"> {unit}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-ink/60">
            <div className="h-2 rounded-full bg-brand transition-all group-hover:brightness-125" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{children}</p>
}

/** 3–5 round gridline values covering 0..max. */
function niceTicks(max: number) {
  const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : max <= 50 ? 10 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1)
  const ticks = []
  for (let t = step; t < max + step; t += step) ticks.push(t)
  return ticks
}
