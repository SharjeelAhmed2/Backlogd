import { motion } from 'motion/react'
import { ArrowRight, Clapperboard, Clock, Gamepad2, Link2, Plus, Star, Tv } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { useLogDialog } from '../components/AppLayout'
import { Poster } from '../components/MediaCard'
import { kindMeta, platformMeta, relativeTime, statusLabel } from '../lib/labels'
import { useLogs } from '../lib/logs'
import type { LogEntry } from '../lib/types'

const connections = [
  { name: 'Letterboxd', how: 'CSV import + RSS', dot: 'bg-film' },
  { name: 'MyAnimeList', how: 'Sign in with MAL', dot: 'bg-anime' },
  { name: 'Steam', how: 'Sign in with Steam', dot: 'bg-steam' },
  { name: 'PlayStation', how: 'Manual logging', dot: 'bg-psn' },
  { name: 'Xbox', how: 'Manual logging', dot: 'bg-xbox' },
]

function TimelineRow({ entry, onClick }: { entry: LogEntry; onClick: () => void }) {
  const { media } = entry
  const meta = kindMeta[media.kind]
  const extra =
    media.kind === 'GAME' && entry.platform
      ? [platformMeta[entry.platform].label, entry.console, entry.hours != null ? `${entry.hours} h` : null]
      : media.kind === 'ANIME' && entry.progress != null
        ? [`${entry.progress}${media.episodes ? `/${media.episodes}` : ''} eps`]
        : [media.year]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl p-2 text-left transition hover:bg-surface-2/70"
    >
      <div className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
        <Poster kind={media.kind} title={media.title} url={media.posterUrl} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className={meta.accent}>{statusLabel(media.kind, entry.status)}</span>{' '}
          <span className="font-medium">{media.title}</span>
        </p>
        <p className="truncate text-xs text-muted">{[meta.label, ...extra].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="shrink-0 text-right">
        {entry.rating != null && (
          <p className="inline-flex items-center gap-1 text-sm font-medium text-amber-300">
            <Star className="h-3.5 w-3.5 fill-amber-300" /> {entry.rating.toFixed(1)}
          </p>
        )}
        <p className="text-xs text-muted">{relativeTime(entry.updatedAt)}</p>
      </div>
    </button>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const dialog = useLogDialog()
  const { data: logs = [], isLoading } = useLogs()
  if (!user) return null

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Late night session' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const of = (kind: LogEntry['media']['kind']) => logs.filter((e) => e.media.kind === kind)
  const stats = [
    { label: 'Films logged', value: of('FILM').length, icon: Clapperboard, accent: 'text-film', to: '/app/films' },
    { label: 'Anime episodes', value: of('ANIME').reduce((s, e) => s + (e.progress ?? 0), 0), icon: Tv, accent: 'text-anime', to: '/app/anime' },
    { label: 'Games played', value: of('GAME').length, icon: Gamepad2, accent: 'text-steam', to: '/app/games' },
    { label: 'Hours in games', value: Math.round(of('GAME').reduce((s, e) => s + (e.hours ?? 0), 0)), icon: Clock, accent: 'text-brand', to: '/app/games' },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted">{greeting},</p>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{user.displayName}</h1>
      </motion.div>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <Link to={s.to} className="glass group block rounded-2xl p-4 transition hover:ring-1 hover:ring-brand/40 sm:p-5">
              <div className="flex items-center justify-between">
                <s.icon className={`h-5 w-5 ${s.accent}`} />
                <ArrowRight className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
              </div>
              <p className="mt-4 font-display text-3xl font-bold tabular-nums">{isLoading ? '–' : s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </Link>
          </motion.div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="glass rounded-3xl p-4 sm:p-6">
          <div className="flex items-center justify-between px-2 sm:px-0">
            <h2 className="font-display text-lg font-semibold">Timeline</h2>
            <button
              onClick={() => dialog.openCreate()}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm ring-1 ring-line transition hover:ring-brand/60"
            >
              <Plus className="h-4 w-4" /> Log something
            </button>
          </div>
          {logs.length > 0 ? (
            <div className="mt-4 space-y-1">
              {logs.slice(0, 10).map((entry) => (
                <TimelineRow key={entry.id} entry={entry} onClick={() => dialog.openEdit(entry)} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
              <div className="flex -space-x-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-film/15 ring-1 ring-film/30">
                  <Clapperboard className="h-5 w-5 text-film" />
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-anime/15 ring-1 ring-anime/30">
                  <Tv className="h-5 w-5 text-anime" />
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-steam/15 ring-1 ring-steam/30">
                  <Gamepad2 className="h-5 w-5 text-steam" />
                </span>
              </div>
              <p className="mt-5 font-medium">{isLoading ? 'Loading…' : 'Your timeline is empty'}</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Connect a source or log your first title. Everything you watch and play will show up here.
              </p>
            </div>
          )}
        </section>

        <section className="glass h-fit rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">Connections</h2>
          <ul className="mt-4 space-y-2">
            {connections.map((c) => (
              <li key={c.name} className="flex items-center justify-between rounded-xl bg-ink/40 px-4 py-3 ring-1 ring-line/70">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.how}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
                  <Link2 className="h-3 w-3" /> Soon
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
