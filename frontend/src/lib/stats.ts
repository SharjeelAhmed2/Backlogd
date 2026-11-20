import type { LogEntry, MediaKind, Platform } from './types'

/** 'all' = everything ever logged; a year = titles *finished* that year (needs a finish date). */
export type Period = 'all' | number

export const ANIME_EPISODE_MINUTES = 24

const kinds: MediaKind[] = ['FILM', 'ANIME', 'GAME']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type ActivityBucket = { label: string; title: string; counts: Record<MediaKind, number>; total: number }

export type Stats = {
  entries: LogEntry[]
  films: number
  animeEpisodes: number
  animeHours: number
  games: number
  gameHours: number
  finished: number
  rated: number
  averageRating: number | null
  activity: ActivityBucket[]
  ratingBuckets: { rating: number; count: number }[]
  genres: { name: string; count: number }[]
  platforms: { platform: Platform; hours: number; games: number }[]
  topRated: LogEntry[]
  /** Finished titles with no finish date — they only show up under All time. */
  undated: number
}

const year = (e: LogEntry) => (e.finishedOn ? Number(e.finishedOn.slice(0, 4)) : null)
const started = (e: LogEntry) => e.status !== 'PLANNED'

/** Years that have at least one finish date, newest first (always includes this year). */
export function availableYears(logs: LogEntry[]): number[] {
  const years = new Set<number>([new Date().getFullYear()])
  for (const e of logs) {
    const y = year(e)
    if (y) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}

export function entriesFor(logs: LogEntry[], period: Period): LogEntry[] {
  if (period === 'all') return logs.filter(started)
  return logs.filter((e) => started(e) && year(e) === period)
}

export function computeStats(logs: LogEntry[], period: Period): Stats {
  const entries = entriesFor(logs, period)
  const of = (k: MediaKind) => entries.filter((e) => e.media.kind === k)

  const films = of('FILM').filter((e) => e.status === 'COMPLETED').length
  const animeEpisodes = of('ANIME').reduce((s, e) => s + (e.progress ?? 0), 0)
  const games = of('GAME')
  const gameHours = games.reduce((s, e) => s + (e.hours ?? 0), 0)
  const rated = entries.filter((e) => e.rating != null)

  return {
    entries,
    films,
    animeEpisodes,
    animeHours: Math.round((animeEpisodes * ANIME_EPISODE_MINUTES) / 60),
    games: games.length,
    gameHours: Math.round(gameHours),
    finished: entries.filter((e) => e.status === 'COMPLETED').length,
    rated: rated.length,
    averageRating: rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null,
    activity: activity(logs, period),
    ratingBuckets: Array.from({ length: 10 }, (_, i) => {
      const rating = (i + 1) / 2
      return { rating, count: rated.filter((e) => e.rating === rating).length }
    }),
    genres: topGenres(entries),
    platforms: platformHours(games),
    topRated: [...rated]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.finishedOn ?? '').localeCompare(a.finishedOn ?? ''))
      .slice(0, 8),
    undated: period === 'all' ? 0 : logs.filter((e) => e.status === 'COMPLETED' && !e.finishedOn).length,
  }
}

/** Finished titles per month (for a year) or per year (all time, last 8 years with data). */
function activity(logs: LogEntry[], period: Period): ActivityBucket[] {
  const dated = logs.filter((e) => e.status === 'COMPLETED' && e.finishedOn)
  const empty = (): Record<MediaKind, number> => ({ FILM: 0, ANIME: 0, GAME: 0 })

  if (period !== 'all') {
    const buckets = MONTHS.map((m, i) => ({ label: m, title: `${m} ${period}`, counts: empty(), total: 0, month: i }))
    for (const e of dated) {
      if (year(e) !== period) continue
      const b = buckets[Number(e.finishedOn!.slice(5, 7)) - 1]
      b.counts[e.media.kind]++
      b.total++
    }
    return buckets
  }

  const byYear = new Map<number, ActivityBucket>()
  for (const e of dated) {
    const y = year(e)!
    const b = byYear.get(y) ?? { label: String(y), title: String(y), counts: empty(), total: 0 }
    b.counts[e.media.kind]++
    b.total++
    byYear.set(y, b)
  }
  return [...byYear.entries()].sort(([a], [b]) => a - b).slice(-8).map(([, b]) => b)
}

/** AniList and TMDB name a few genres differently; count them as one. */
const GENRE_ALIASES: Record<string, string> = {
  'Sci-Fi': 'Science Fiction',
  'Mahou Shoujo': 'Magical Girl',
}

function topGenres(entries: LogEntry[]) {
  const counts = new Map<string, number>()
  for (const e of entries) {
    for (const raw of new Set(e.media.genres.map((g) => GENRE_ALIASES[g] ?? g))) {
      counts.set(raw, (counts.get(raw) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8)
}

function platformHours(games: LogEntry[]) {
  const map = new Map<Platform, { platform: Platform; hours: number; games: number }>()
  for (const e of games) {
    if (!e.platform) continue
    const p = map.get(e.platform) ?? { platform: e.platform, hours: 0, games: 0 }
    p.hours += e.hours ?? 0
    p.games++
    map.set(e.platform, p)
  }
  return [...map.values()].map((p) => ({ ...p, hours: Math.round(p.hours) })).sort((a, b) => b.hours - a.hours || b.games - a.games)
}

export { kinds, MONTHS }

// ---------- Wrapped ----------

export type Persona = { name: string; blurb: string }

export function criticPersona(avg: number | null, rated: number): Persona | null {
  if (avg == null || rated < 3) return null
  if (avg >= 4.2) return { name: 'The Enthusiast', blurb: 'You go in with an open heart and it shows. Almost everything earns its stars.' }
  if (avg >= 3.6) return { name: 'The Fair Judge', blurb: "Generous when it's earned, honest when it isn't. A balanced eye." }
  if (avg >= 3) return { name: 'The Discerning Critic', blurb: 'Your stars are hard-won. When you love something, it means something.' }
  return { name: 'The Tough Crowd', blurb: 'Few things impress you — which makes your five-star picks legendary.' }
}

export type Wrapped = {
  year: number
  stats: Stats
  topFilm: LogEntry | null
  topAnime: LogEntry | null
  topGame: LogEntry | null
  filmPosters: string[]
  busiestMonth: ActivityBucket | null
  persona: Persona | null
}

function best(entries: LogEntry[], kind: MediaKind, by: 'rating' | 'hours' = 'rating') {
  const list = entries.filter((e) => e.media.kind === kind)
  return (
    [...list].sort((a, b) =>
      by === 'hours'
        ? (b.hours ?? 0) - (a.hours ?? 0) || (b.rating ?? 0) - (a.rating ?? 0)
        : (b.rating ?? 0) - (a.rating ?? 0) || (b.finishedOn ?? '').localeCompare(a.finishedOn ?? ''),
    )[0] ?? null
  )
}

export function computeWrapped(logs: LogEntry[], year: number): Wrapped {
  const stats = computeStats(logs, year)
  const finished = stats.entries.filter((e) => e.status === 'COMPLETED')
  const busiest = stats.activity.reduce<ActivityBucket | null>((m, b) => (b.total > (m?.total ?? 0) ? b : m), null)
  const topGameByHours = best(stats.entries, 'GAME', 'hours')
  return {
    year,
    stats,
    topFilm: best(finished, 'FILM'),
    topAnime: best(stats.entries, 'ANIME'),
    topGame: topGameByHours?.hours ? topGameByHours : best(stats.entries, 'GAME'),
    filmPosters: finished
      .filter((e) => e.media.kind === 'FILM' && e.media.posterUrl)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5)
      .map((e) => e.media.posterUrl!),
    busiestMonth: busiest && busiest.total > 1 ? busiest : null,
    persona: criticPersona(stats.averageRating, stats.rated),
  }
}

export function hasWrapped(logs: LogEntry[], year: number) {
  return entriesFor(logs, year).length >= 3
}
