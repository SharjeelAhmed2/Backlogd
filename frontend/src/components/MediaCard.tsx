import { Clapperboard, Gamepad2, Star, Tv } from 'lucide-react'
import { platformMeta, statusLabel, statusStyle } from '../lib/labels'
import type { LogEntry, MediaKind } from '../lib/types'

const kindIcon = { FILM: Clapperboard, ANIME: Tv, GAME: Gamepad2 }

const fallbackHue: Record<MediaKind, string> = {
  FILM: 'from-emerald-500/40 via-teal-800/40 to-ink',
  ANIME: 'from-indigo-400/50 via-violet-800/40 to-ink',
  GAME: 'from-sky-400/40 via-blue-900/50 to-ink',
}

export function Poster({ kind, title, url, className = '' }: { kind: MediaKind; title: string; url: string | null; className?: string }) {
  const Icon = kindIcon[kind]
  if (url) {
    return <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
  }
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br p-4 text-center ${fallbackHue[kind]} ${className}`}>
      <Icon className="h-8 w-8 text-white/50" />
      <span className="line-clamp-3 font-display text-sm font-semibold text-white/80">{title}</span>
    </div>
  )
}

/** Poster-shaped card used in the Films / Anime / Games grids. */
export function MediaCard({ entry, onClick }: { entry: LogEntry; onClick: () => void }) {
  const { media } = entry
  const platform = entry.platform ? platformMeta[entry.platform] : null

  let detail: string | null = media.year ? String(media.year) : null
  if (media.kind === 'ANIME' && (entry.progress != null || media.episodes)) {
    detail = `${entry.progress ?? 0}${media.episodes ? ` / ${media.episodes}` : ''} eps`
  }
  if (media.kind === 'GAME' && entry.hours != null) {
    detail = `${entry.hours} h`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block aspect-[2/3] w-full overflow-hidden rounded-2xl bg-surface-2 text-left ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand/20 hover:ring-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Poster
        kind={media.kind}
        title={media.title}
        url={media.posterUrl}
        className="transition duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

      <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 backdrop-blur-md ${statusStyle[entry.status]}`}>
          {statusLabel(media.kind, entry.status)}
        </span>
        {entry.rating != null && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-white/10 backdrop-blur-md">
            <Star className="h-3 w-3 fill-amber-300" /> {entry.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3">
        {platform && (
          <span className={`mb-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 backdrop-blur-md ${platform.style}`}>
            {platform.label}
            {entry.console && <span className="opacity-75">· {entry.console}</span>}
          </span>
        )}
        <p className="line-clamp-2 font-display text-sm font-semibold leading-tight text-white">{media.title}</p>
        {detail && <p className="mt-0.5 text-xs text-white/60">{detail}</p>}
      </div>
    </button>
  )
}
