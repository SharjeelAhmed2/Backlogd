export type MediaKind = 'FILM' | 'ANIME' | 'GAME'
export type MediaSource = 'TMDB' | 'ANILIST' | 'MANUAL'
export type LogStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'DROPPED'
export type Platform = 'PLAYSTATION' | 'XBOX' | 'PC' | 'NINTENDO' | 'MOBILE' | 'OTHER'

/** A title from AniList / TMDB search, or a cached one attached to a log entry. */
export type CatalogItem = {
  kind: MediaKind
  source: MediaSource
  externalId: string | null
  title: string
  year: number | null
  posterUrl: string | null
  backdropUrl: string | null
  overview: string | null
  episodes: number | null
  genres: string[]
}

export type Media = CatalogItem & { id: string }

export type LogEntry = {
  id: string
  media: Media
  status: LogStatus
  rating: number | null
  platform: Platform | null
  console: string | null
  progress: number | null
  hours: number | null
  startedOn: string | null
  finishedOn: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type MediaRef = {
  source: MediaSource
  externalId?: string | null
  kind?: MediaKind
  title?: string
  year?: number | null
  posterUrl?: string | null
}

export type LogInput = {
  media?: MediaRef
  status: LogStatus
  rating: number | null
  platform: Platform | null
  console: string | null
  progress: number | null
  hours: number | null
  startedOn: string | null
  finishedOn: string | null
  notes: string | null
}
