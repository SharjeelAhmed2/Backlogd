import { motion } from 'motion/react'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLogDialog } from '../components/AppLayout'
import { MediaCard } from '../components/MediaCard'
import { kindMeta, platformMeta, platforms, statusLabel, statuses } from '../lib/labels'
import { useLogs } from '../lib/logs'
import type { LogEntry, LogStatus, MediaKind, Platform } from '../lib/types'

type Sort = 'recent' | 'rating' | 'title'

const blurb: Record<MediaKind, string> = {
  FILM: 'Everything you have watched, and everything on your watchlist.',
  ANIME: 'Your seasons, episodes and plan-to-watch pile.',
  GAME: 'Every game you have played, on every platform.',
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1 transition ${
        active ? 'bg-text text-ink ring-text' : 'bg-surface/60 text-muted ring-line hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

export function LibraryPage({ kind }: { kind: MediaKind }) {
  const { data, isLoading, error } = useLogs()
  const dialog = useLogDialog()
  const [status, setStatus] = useState<LogStatus | 'ALL'>('ALL')
  const [platform, setPlatform] = useState<Platform | 'ALL'>('ALL')
  const [sort, setSort] = useState<Sort>('recent')
  const [query, setQuery] = useState('')

  const entries = useMemo(() => (data ?? []).filter((e) => e.media.kind === kind), [data, kind])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = entries.filter(
      (e) =>
        (status === 'ALL' || e.status === status) &&
        (platform === 'ALL' || e.platform === platform) &&
        (!q || e.media.title.toLowerCase().includes(q)),
    )
    const sorters: Record<Sort, (a: LogEntry, b: LogEntry) => number> = {
      recent: () => 0, // API already returns newest first
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
      title: (a, b) => a.media.title.localeCompare(b.media.title),
    }
    return [...list].sort(sorters[sort])
  }, [entries, status, platform, sort, query])

  const countBy = <K extends 'status' | 'platform'>(key: K, value: LogEntry[K]) =>
    entries.filter((e) => e[key] === value).length

  const meta = kindMeta[kind]
  const hours = kind === 'GAME' ? entries.reduce((sum, e) => sum + (e.hours ?? 0), 0) : 0

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <motion.div
        key={kind}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{meta.plural}</h1>
          <p className="mt-1 text-sm text-muted">
            {blurb[kind]}{' '}
            {entries.length > 0 && (
              <span className="text-text/80">
                {entries.length} logged{hours > 0 && ` · ${Math.round(hours)} h played`}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => dialog.openCreate(kind)}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-sm ring-1 ring-line transition hover:ring-brand/60"
        >
          <Plus className="h-4 w-4" /> Add {meta.label.toLowerCase()}
        </button>
      </motion.div>

      {entries.length > 0 && (
        <div className="mt-6 space-y-3">
          {kind === 'GAME' && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip active={platform === 'ALL'} onClick={() => setPlatform('ALL')}>
                All platforms
              </Chip>
              {platforms
                .filter((p) => countBy('platform', p) > 0)
                .map((p) => (
                  <Chip key={p} active={platform === p} onClick={() => setPlatform(p)}>
                    <span className={`h-2 w-2 rounded-full ${platformMeta[p].dot}`} />
                    {platformMeta[p].label}
                    <span className="opacity-60">{countBy('platform', p)}</span>
                  </Chip>
                ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip active={status === 'ALL'} onClick={() => setStatus('ALL')}>
                All
              </Chip>
              {statuses
                .filter((s) => countBy('status', s) > 0)
                .map((s) => (
                  <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                    {statusLabel(kind, s)} <span className="opacity-60">{countBy('status', s)}</span>
                  </Chip>
                ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter…"
                  className="w-36 rounded-full border border-line bg-surface/60 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-brand sm:w-44"
                />
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-full border border-line bg-surface/60 px-3 py-1.5 text-sm outline-none focus:border-brand"
              >
                <option value="recent">Recent</option>
                <option value="rating">Rating</option>
                <option value="title">A–Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <section className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-surface-2/70" />
            ))}
          </div>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-300">Couldn't load your log. Is the backend running?</p>
        ) : shown.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {shown.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
              >
                <MediaCard entry={entry} onClick={() => dialog.openEdit(entry)} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-3xl border border-dashed border-line px-6 py-20 text-center">
            <p className="font-medium">{entries.length ? 'Nothing matches these filters' : `No ${meta.plural.toLowerCase()} yet`}</p>
            <p className="mt-1 text-sm text-muted">
              {entries.length ? 'Try clearing a filter.' : `Log your first ${meta.label.toLowerCase()} to start the grid.`}
            </p>
            {!entries.length && (
              <button
                onClick={() => dialog.openCreate(kind)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-sm font-medium text-ink"
              >
                <Plus className="h-4 w-4" /> Add {meta.label.toLowerCase()}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
