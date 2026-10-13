import type { LogStatus, MediaKind, Platform } from './types'

export const kindMeta: Record<MediaKind, { label: string; plural: string; path: string; accent: string }> = {
  FILM: { label: 'Film', plural: 'Films', path: '/app/films', accent: 'text-film' },
  ANIME: { label: 'Anime', plural: 'Anime', path: '/app/anime', accent: 'text-anime' },
  GAME: { label: 'Game', plural: 'Games', path: '/app/games', accent: 'text-steam' },
}

export const statuses: LogStatus[] = ['IN_PROGRESS', 'COMPLETED', 'PLANNED', 'PAUSED', 'DROPPED']

const statusText: Record<MediaKind, Record<LogStatus, string>> = {
  FILM: { IN_PROGRESS: 'Watching', COMPLETED: 'Watched', PLANNED: 'Watchlist', PAUSED: 'Paused', DROPPED: 'Dropped' },
  ANIME: { IN_PROGRESS: 'Watching', COMPLETED: 'Completed', PLANNED: 'Plan to watch', PAUSED: 'On hold', DROPPED: 'Dropped' },
  GAME: { IN_PROGRESS: 'Playing', COMPLETED: 'Beaten', PLANNED: 'Backlog', PAUSED: 'On hold', DROPPED: 'Dropped' },
}

export function statusLabel(kind: MediaKind, status: LogStatus) {
  return statusText[kind][status]
}

export const statusStyle: Record<LogStatus, string> = {
  IN_PROGRESS: 'bg-brand-2/20 text-brand-2 ring-brand-2/40',
  COMPLETED: 'bg-film/15 text-film ring-film/40',
  PLANNED: 'bg-white/10 text-text/80 ring-white/20',
  PAUSED: 'bg-amber-400/15 text-amber-300 ring-amber-300/40',
  DROPPED: 'bg-red-500/15 text-red-300 ring-red-300/40',
}

export const platforms: Platform[] = ['PLAYSTATION', 'XBOX', 'PC', 'NINTENDO', 'MOBILE', 'OTHER']

export const platformMeta: Record<Platform, { label: string; style: string; dot: string }> = {
  PLAYSTATION: { label: 'PlayStation', style: 'bg-psn/20 text-[#7fb6ff] ring-psn/50', dot: 'bg-psn' },
  XBOX: { label: 'Xbox', style: 'bg-xbox/20 text-[#8ee08e] ring-xbox/50', dot: 'bg-xbox' },
  PC: { label: 'PC', style: 'bg-steam/20 text-steam ring-steam/50', dot: 'bg-steam' },
  NINTENDO: { label: 'Nintendo', style: 'bg-red-500/20 text-red-300 ring-red-400/50', dot: 'bg-red-500' },
  MOBILE: { label: 'Mobile', style: 'bg-amber-400/20 text-amber-200 ring-amber-300/50', dot: 'bg-amber-400' },
  OTHER: { label: 'Other', style: 'bg-white/10 text-text/80 ring-white/25', dot: 'bg-muted' },
}

/** Suggestions for the free-text console field, per platform family. */
export const consoleSuggestions: Record<Platform, string[]> = {
  PLAYSTATION: ['PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PSP', 'PS Vita'],
  XBOX: ['Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series X|S'],
  PC: ['Steam', 'Epic Games', 'GOG', 'Xbox app', 'EA app', 'Ubisoft Connect'],
  NINTENDO: ['Switch', 'Switch 2', 'Wii', 'Wii U', '3DS', 'DS', 'GameCube'],
  MOBILE: ['Android', 'iOS'],
  OTHER: [],
}

export function relativeTime(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return 'just now'
}
