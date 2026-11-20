import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, RotateCcw, Star, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Poster } from '../components/MediaCard'
import { MONTHS } from '../lib/stats'
import { platformMeta } from '../lib/labels'
import { useLogs } from '../lib/logs'
import { computeWrapped, hasWrapped, type Wrapped } from '../lib/stats'
import type { LogEntry } from '../lib/types'

const SLIDE_MS = 6000

type Slide = { key: string; bg: string; render: () => ReactNode }

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
})

function Eyebrow({ children }: { children: ReactNode }) {
  return <motion.p {...rise(0.1)} className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">{children}</motion.p>
}

function Big({ children, delay = 0.3 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.p {...rise(delay)} className="font-display text-6xl font-bold leading-none tracking-tight sm:text-8xl">
      {children}
    </motion.p>
  )
}

function Line({ children, delay = 0.6 }: { children: ReactNode; delay?: number }) {
  return <motion.p {...rise(delay)} className="mx-auto max-w-md text-lg text-white/80 sm:text-xl">{children}</motion.p>
}

function Feature({ entry, label }: { entry: LogEntry; label: string }) {
  return (
    <motion.div {...rise(0.4)} className="mt-8 flex flex-col items-center gap-4">
      <motion.div
        initial={{ rotate: -6, scale: 0.85 }}
        animate={{ rotate: -2, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
        className="aspect-[2/3] w-40 overflow-hidden rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/20 sm:w-48"
      >
        <Poster kind={entry.media.kind} title={entry.media.title} url={entry.media.posterUrl} />
      </motion.div>
      <div>
        <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold">{entry.media.title}</p>
        {entry.rating != null && (
          <p className="mt-1 inline-flex items-center gap-1 text-amber-300">
            <Star className="h-4 w-4 fill-amber-300" /> {entry.rating.toFixed(1)}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function buildSlides(w: Wrapped, name: string): Slide[] {
  const s = w.stats
  const slides: Slide[] = [
    {
      key: 'intro',
      bg: 'from-[#2a1a5e] via-[#141032] to-ink',
      render: () => (
        <>
          <Eyebrow>Backlogd Wrapped</Eyebrow>
          <Big>{w.year}</Big>
          <Line>{name}, here's your year in films, anime and games.</Line>
        </>
      ),
    },
  ]

  if (s.films > 0) {
    slides.push({
      key: 'films',
      bg: 'from-[#0d4d2b] via-[#0b2418] to-ink',
      render: () => (
        <>
          <Eyebrow>At the movies</Eyebrow>
          <Big>{s.films}</Big>
          <Line>{s.films === 1 ? 'film watched.' : 'films watched. That’s a lot of popcorn.'}</Line>
          {w.filmPosters.length > 1 && (
            <div className="mt-8 flex justify-center -space-x-6">
              {w.filmPosters.map((url, i) => (
                <motion.img
                  key={url}
                  src={url}
                  alt=""
                  initial={{ opacity: 0, y: 40, rotate: 0 }}
                  animate={{ opacity: 1, y: 0, rotate: (i - (w.filmPosters.length - 1) / 2) * 6 }}
                  transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 110 }}
                  className="aspect-[2/3] w-20 rounded-xl object-cover shadow-xl ring-2 ring-ink sm:w-28"
                />
              ))}
            </div>
          )}
        </>
      ),
    })
  }
  if (w.topFilm) {
    slides.push({
      key: 'top-film',
      bg: 'from-[#14532d] via-[#0e1f17] to-ink',
      render: () => (
        <>
          <Eyebrow>Film of the year</Eyebrow>
          <Feature entry={w.topFilm!} label="Your highest rated" />
        </>
      ),
    })
  }
  if (s.animeEpisodes > 0) {
    slides.push({
      key: 'anime',
      bg: 'from-[#3b1f7a] via-[#1a1236] to-ink',
      render: () => (
        <>
          <Eyebrow>Anime</Eyebrow>
          <Big>{s.animeEpisodes.toLocaleString()}</Big>
          <Line>episodes — about {s.animeHours.toLocaleString()} hours of anime.</Line>
          {w.topAnime && <Feature entry={w.topAnime} label="Your favourite series" />}
        </>
      ),
    })
  }
  if (s.games > 0) {
    const topPlatform = s.platforms[0]
    slides.push({
      key: 'games',
      bg: 'from-[#0c3d63] via-[#0b1a2c] to-ink',
      render: () => (
        <>
          <Eyebrow>Controller in hand</Eyebrow>
          <Big>{s.gameHours > 0 ? `${s.gameHours.toLocaleString()}h` : s.games}</Big>
          <Line>
            {s.gameHours > 0 ? `across ${s.games} ${s.games === 1 ? 'game' : 'games'}` : s.games === 1 ? 'game played' : 'games played'}
            {topPlatform && topPlatform.hours > 0 ? `, mostly on ${platformMeta[topPlatform.platform].label}.` : '.'}
          </Line>
          {w.topGame && <Feature entry={w.topGame} label={w.topGame.hours ? `${w.topGame.hours} hours in` : 'Your top game'} />}
        </>
      ),
    })
  }
  if (s.genres[0]) {
    slides.push({
      key: 'genre',
      bg: 'from-[#6b1d4a] via-[#2a1022] to-ink',
      render: () => (
        <>
          <Eyebrow>Your genre</Eyebrow>
          <Line delay={0.25}>You couldn't get enough of</Line>
          <Big delay={0.5}>{s.genres[0].name}</Big>
          <Line delay={0.8}>
            {s.genres[0].count} titles.{s.genres[1] && ` Runner-up: ${s.genres[1].name}.`}
          </Line>
        </>
      ),
    })
  }
  if (w.busiestMonth) {
    const month = MONTHS.indexOf(w.busiestMonth.label)
    const full = new Date(w.year, month, 1).toLocaleString(undefined, { month: 'long' })
    slides.push({
      key: 'month',
      bg: 'from-[#5c3b0a] via-[#24180a] to-ink',
      render: () => (
        <>
          <Eyebrow>Busiest month</Eyebrow>
          <Big>{full}</Big>
          <Line>You finished {w.busiestMonth!.total} titles. Somebody had a lot of free time.</Line>
        </>
      ),
    })
  }
  if (w.persona) {
    slides.push({
      key: 'persona',
      bg: 'from-[#1e3a8a] via-[#121a3a] to-ink',
      render: () => (
        <>
          <Eyebrow>Your critic personality</Eyebrow>
          <Big delay={0.35}>{w.persona!.name}</Big>
          <Line delay={0.7}>
            Average rating <span className="font-semibold text-amber-300">{s.averageRating!.toFixed(1)}★</span> across {s.rated} ratings. {w.persona!.blurb}
          </Line>
        </>
      ),
    })
  }
  slides.push({
    key: 'summary',
    bg: 'from-[#2a1a5e] via-[#101528] to-ink',
    render: () => <Summary w={w} name={name} />,
  })
  return slides
}

function Summary({ w, name }: { w: Wrapped; name: string }) {
  const s = w.stats
  const numbers = [
    { label: 'Films', value: s.films },
    { label: 'Episodes', value: s.animeEpisodes },
    { label: 'Games', value: s.games },
    { label: 'Game hours', value: s.gameHours },
  ].filter((n) => n.value > 0)
  const picks = [w.topFilm, w.topAnime, w.topGame].filter((e): e is LogEntry => !!e)
  return (
    <motion.div {...rise(0.1)} className="glass mx-auto w-full max-w-md rounded-3xl p-6 text-left shadow-2xl shadow-black/50">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Backlogd Wrapped · {w.year}</p>
      <p className="mt-1 font-display text-2xl font-bold">{name}'s year</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {numbers.map((n) => (
          <div key={n.label} className="rounded-2xl bg-ink/50 p-3 ring-1 ring-line">
            <p className="font-display text-2xl font-bold tabular-nums">{n.value.toLocaleString()}</p>
            <p className="text-xs text-muted">{n.label}</p>
          </div>
        ))}
      </div>
      {picks.length > 0 && (
        <>
          <p className="mt-5 text-xs uppercase tracking-wider text-muted">Top picks</p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {picks.map((e) => (
              <div key={e.id}>
                <div className="aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10">
                  <Poster kind={e.media.kind} title={e.media.title} url={e.media.posterUrl} />
                </div>
                <p className="mt-1 truncate text-[11px]">{e.media.title}</p>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
        {s.genres[0] && <span className="rounded-full bg-ink/50 px-2.5 py-1 ring-1 ring-line">Top genre: {s.genres[0].name}</span>}
        {w.persona && <span className="rounded-full bg-ink/50 px-2.5 py-1 ring-1 ring-line">{w.persona.name}</span>}
      </div>
    </motion.div>
  )
}

export function WrappedPage() {
  const { year: yearParam } = useParams()
  const year = Number(yearParam)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: logs, isLoading } = useLogs()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = useMemo(
    () => (logs && hasWrapped(logs, year) ? buildSlides(computeWrapped(logs, year), user?.displayName ?? 'You') : []),
    [logs, year, user],
  )
  const last = slides.length - 1
  const close = useCallback(() => navigate('/app/stats'), [navigate])
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, last)), [last])
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])

  // Auto-advance; the summary slide stays put
  useEffect(() => {
    if (paused || index >= last) return
    const t = setTimeout(next, SLIDE_MS)
    return () => clearTimeout(t)
  }, [index, paused, last, next])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'Escape') close()
      else if (e.key === ' ') setPaused((p) => !p)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [next, prev, close])

  if (!Number.isInteger(year)) return <Navigate to="/app/stats" replace />
  if (isLoading) return <div className="fixed inset-0 z-50 bg-ink" />
  if (!slides.length) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink px-6 text-center">
        <div>
          <p className="font-display text-2xl font-semibold">Not enough for a {year} Wrapped yet</p>
          <p className="mt-2 text-sm text-muted">Finish (and date) at least three titles in {year}.</p>
          <Link to="/app/stats" className="mt-6 inline-block rounded-full bg-surface-2 px-4 py-2 text-sm ring-1 ring-line">Back to stats</Link>
        </div>
      </div>
    )
  }

  const slide = slides[Math.min(index, last)]
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink text-white" role="region" aria-roledescription="story" aria-label={`${year} Wrapped`}>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={slide.key + '-bg'}
          className={`absolute inset-0 bg-gradient-to-b ${slide.bg}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-brand-2/15 blur-[120px]" />

      {/* progress bars */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 px-4 pt-4 sm:px-8">
        {slides.map((s, i) => (
          <div key={s.key} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            {i < index || (i === index && i === last) ? (
              <div className="h-full w-full bg-white" />
            ) : i === index ? (
              <motion.div
                key={`${s.key}-${paused}`}
                className="h-full bg-white"
                initial={{ width: '0%' }}
                animate={{ width: paused ? undefined : '100%' }}
                transition={{ duration: SLIDE_MS / 1000, ease: 'linear' }}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="absolute right-3 top-7 z-30 flex gap-1 sm:right-6">
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'} className="rounded-full p-2 text-white/80 hover:bg-white/10">
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
        <button onClick={close} aria-label="Close" className="rounded-full p-2 text-white/80 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* tap zones */}
      <button aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize" />
      <button aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize" />

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.key}
          className="relative z-0 flex h-full flex-col items-center justify-center px-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.35 }}
        >
          {slide.render()}
        </motion.div>
      </AnimatePresence>

      {index === last && (
        <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center gap-3">
          <button onClick={() => setIndex(0)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur hover:bg-white/20">
            <RotateCcw className="h-4 w-4" /> Replay
          </button>
          <Link to="/app/stats" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-white/90">
            Back to stats
          </Link>
        </div>
      )}
    </div>
  )
}
