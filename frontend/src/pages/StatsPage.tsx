import { motion } from 'motion/react'
import { Clapperboard, Clock, Gamepad2, Info, Play, Sparkles, Star, Trophy, Tv } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useLogDialog } from '../components/AppLayout'
import { ActivityChart, BarList, ChartCard, RatingChart } from '../components/Charts'
import { Poster } from '../components/MediaCard'
import { kindMeta, platformMeta } from '../lib/labels'
import { useLogs } from '../lib/logs'
import { ANIME_EPISODE_MINUTES, availableYears, computeStats, hasWrapped, type Period, type Stats } from '../lib/stats'

function platformRows(platforms: Stats['platforms']) {
  return platforms.map((p) => ({
    key: p.platform,
    label: (
      <span className="inline-flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${platformMeta[p.platform].dot}`} />
        {platformMeta[p.platform].label}
        <span className="text-xs text-muted">· {p.games} {p.games === 1 ? 'game' : 'games'}</span>
      </span>
    ),
    value: p.hours,
    detail: `${p.hours} hours across ${p.games} games`,
  }))
}

export function StatsPage() {
  const { data: logs = [], isLoading } = useLogs()
  const dialog = useLogDialog()
  const years = useMemo(() => availableYears(logs), [logs])
  const [period, setPeriod] = useState<Period>('all')
  const stats = useMemo(() => computeStats(logs, period), [logs, period])
  const wrappedYear = period === 'all' ? years.find((y) => hasWrapped(logs, y)) : hasWrapped(logs, period) ? period : undefined

  const tiles = [
    { label: 'Films watched', value: stats.films, icon: Clapperboard, accent: 'text-film' },
    { label: 'Anime episodes', value: stats.animeEpisodes, icon: Tv, accent: 'text-anime', sub: stats.animeHours ? `≈ ${stats.animeHours.toLocaleString()} h watched` : undefined },
    { label: 'Games played', value: stats.games, icon: Gamepad2, accent: 'text-steam' },
    { label: 'Hours in games', value: stats.gameHours, icon: Clock, accent: 'text-brand' },
    { label: 'Titles finished', value: stats.finished, icon: Trophy, accent: 'text-amber-300' },
    { label: 'Average rating', value: stats.averageRating == null ? '–' : `${stats.averageRating.toFixed(1)}★`, icon: Star, accent: 'text-amber-300', sub: stats.rated ? `${stats.rated} rated` : undefined },
  ]

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Stats</h1>
          <p className="mt-1 text-sm text-muted">
            {period === 'all' ? 'Everything you have logged.' : `What you finished in ${period}.`}
          </p>
        </div>
        {wrappedYear && (
          <Link
            to={`/app/wrapped/${wrappedYear}`}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-sm font-medium text-ink shadow-[0_0_40px_-10px] shadow-brand/70 transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" /> Play your {wrappedYear} Wrapped <Play className="h-3.5 w-3.5 fill-ink" />
          </Link>
        )}
      </motion.div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Period">
        {(['all', ...years] as Period[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${
              period === p ? 'bg-text text-ink ring-text' : 'bg-surface/60 text-muted ring-line hover:text-text'
            }`}
          >
            {p === 'all' ? 'All time' : p}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2/70" />)}
        </div>
      ) : stats.entries.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-3xl border border-dashed border-line px-6 py-20 text-center">
          <p className="font-medium">{period === 'all' ? 'Nothing logged yet' : `Nothing finished in ${period} yet`}</p>
          <p className="mt-1 max-w-md text-sm text-muted">
            {period === 'all'
              ? 'Log a few titles or import from Letterboxd, MyAnimeList or Steam, and your stats appear here.'
              : 'Year views count titles by their finish date. Add a finish date when you mark something done.'}
          </p>
          <button onClick={() => dialog.openCreate()} className="mt-5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-sm font-medium text-ink">
            Log something
          </button>
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {tiles.map((t, i) => (
              <motion.div key={t.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }} className="glass rounded-2xl p-4">
                <t.icon className={`h-5 w-5 ${t.accent}`} />
                <p className="mt-3 font-display text-3xl font-bold tabular-nums">{typeof t.value === 'number' ? t.value.toLocaleString() : t.value}</p>
                <p className="text-sm text-muted">{t.label}</p>
                {t.sub && <p className="mt-0.5 text-xs text-muted/80">{t.sub}</p>}
              </motion.div>
            ))}
          </section>

          {stats.undated > 0 && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted">
              <Info className="mt-px h-3.5 w-3.5 shrink-0" />
              {stats.undated} finished {stats.undated === 1 ? 'title has' : 'titles have'} no finish date, so {stats.undated === 1 ? 'it only counts' : 'they only count'} under All time.
              Steam games and Letterboxd films without a diary entry come in undated — open one and set Finished to include it.
            </p>
          )}

          <div className="mt-6">
            <ChartCard
              title={period === 'all' ? 'Finished per year' : `Finished per month in ${period}`}
              subtitle="Titles marked done, by finish date"
            >
              <ActivityChart buckets={stats.activity} />
            </ChartCard>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ChartCard title="How you rate" subtitle="Rated titles at each half-star step">
              <RatingChart buckets={stats.ratingBuckets} average={stats.averageRating} />
            </ChartCard>
            <ChartCard title="Top genres" subtitle="Films and anime, by number of titles">
              <BarList
                rows={stats.genres.map((g) => ({ key: g.name, label: g.name, value: g.count, detail: `${g.count} titles` }))}
                empty="Genres appear for titles found on TMDB or AniList."
              />
            </ChartCard>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <ChartCard title="Hours by platform" subtitle="Where your game time went">
              <BarList rows={platformRows(stats.platforms)} unit="h" empty="No games with hours in this period." />
            </ChartCard>
            <ChartCard title="Highest rated" subtitle={period === 'all' ? 'Your top picks of all time' : `Your top picks of ${period}`}>
              {stats.topRated.length ? (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
                  {stats.topRated.map((e) => (
                    <button key={e.id} onClick={() => dialog.openEdit(e)} className="group text-left" title={`${e.media.title} · ${e.rating?.toFixed(1)}★`}>
                      <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10 transition group-hover:ring-brand/60">
                        <Poster kind={e.media.kind} title={e.media.title} url={e.media.posterUrl} />
                      </div>
                      <p className="mt-1 truncate text-[11px] font-medium">{e.media.title}</p>
                      <p className="text-[10px] text-muted">
                        <span className="text-amber-300">{e.rating?.toFixed(1)}★</span> · {kindMeta[e.media.kind].label}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">Rate a few titles to see your favourites.</p>
              )}
            </ChartCard>
          </div>
          <p className="mt-6 text-center text-[11px] text-muted/70">Anime hours assume {ANIME_EPISODE_MINUTES} minutes per episode.</p>
        </>
      )}
    </main>
  )
}
