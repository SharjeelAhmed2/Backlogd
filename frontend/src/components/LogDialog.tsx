import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Clapperboard, Gamepad2, Loader2, Search, Trash2, Tv, X } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../lib/api'
import { consoleSuggestions, kindMeta, platformMeta, platforms, statusLabel, statuses } from '../lib/labels'
import { useCatalogSearch, useDeleteLog, useSaveLog, useSearchSources } from '../lib/logs'
import type { CatalogItem, LogEntry, LogInput, LogStatus, MediaKind, Platform } from '../lib/types'
import { Poster } from './MediaCard'
import { StarRating } from './StarRating'

export type DialogTarget = { mode: 'create'; kind: MediaKind } | { mode: 'edit'; entry: LogEntry }

const kindIcon = { FILM: Clapperboard, ANIME: Tv, GAME: Gamepad2 }

export function LogDialog({ target, onClose }: { target: DialogTarget | null; onClose: () => void }) {
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [target, onClose])

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="glass relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl shadow-2xl shadow-black/60 sm:rounded-3xl"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-text"
            >
              <X className="h-5 w-5" />
            </button>
            <DialogBody key={target.mode === 'edit' ? target.entry.id : 'create'} target={target} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DialogBody({ target, onClose }: { target: DialogTarget; onClose: () => void }) {
  const [kind, setKind] = useState<MediaKind>(target.mode === 'edit' ? target.entry.media.kind : target.kind)
  const [picked, setPicked] = useState<CatalogItem | null>(target.mode === 'edit' ? target.entry.media : null)
  const [manual, setManual] = useState(target.mode === 'create' && target.kind === 'GAME')

  if (target.mode === 'edit' || picked || manual) {
    return (
      <EntryForm
        kind={kind}
        picked={picked}
        entry={target.mode === 'edit' ? target.entry : null}
        onBack={
          target.mode === 'create' && kind !== 'GAME'
            ? () => {
                setPicked(null)
                setManual(false)
              }
            : undefined
        }
        onDone={onClose}
        kindSwitcher={
          target.mode === 'create' && kind === 'GAME' ? (
            <KindTabs value={kind} onChange={(k) => { setKind(k); setManual(k === 'GAME') }} />
          ) : null
        }
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="px-5 pt-5 sm:px-7 sm:pt-7">
        <h2 className="font-display text-xl font-semibold">Log something</h2>
        <div className="mt-4">
          <KindTabs value={kind} onChange={(k) => { setKind(k); setManual(k === 'GAME') }} />
        </div>
      </div>
      <SearchStep kind={kind} onPick={setPicked} onManual={() => setManual(true)} />
    </div>
  )
}

function KindTabs({ value, onChange }: { value: MediaKind; onChange: (k: MediaKind) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-ink/60 p-1 ring-1 ring-line">
      {(['ANIME', 'FILM', 'GAME'] as MediaKind[]).map((k) => {
        const Icon = kindIcon[k]
        const active = k === value
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
              active ? 'bg-surface-2 text-text shadow ring-1 ring-line' : 'text-muted hover:text-text'
            }`}
          >
            <Icon className={`h-4 w-4 ${active ? kindMeta[k].accent : ''}`} />
            {kindMeta[k].label}
          </button>
        )
      })}
    </div>
  )
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function SearchStep({ kind, onPick, onManual }: { kind: MediaKind; onPick: (i: CatalogItem) => void; onManual: () => void }) {
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 350)
  const sources = useSearchSources()
  const searchable = sources.data?.[kind] ?? kind === 'ANIME'
  const results = useCatalogSearch(kind, debounced, searchable)
  const sourceName = kind === 'ANIME' ? 'AniList' : 'TMDB'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-5 pt-4 sm:px-7">
        {searchable ? (
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${kindMeta[kind].plural.toLowerCase()} on ${sourceName}…`}
              className="w-full rounded-xl border border-line bg-ink/60 py-3 pl-11 pr-10 text-sm outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/15"
            />
            {results.isFetching && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />}
          </label>
        ) : (
          <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            Film search turns on once <code className="rounded bg-ink/60 px-1">TMDB_API_KEY</code> is set in{' '}
            <code className="rounded bg-ink/60 px-1">backend/.env</code> and the backend is restarted.
          </div>
        )}
      </div>

      <div className="min-h-[18rem] flex-1 overflow-y-auto px-5 py-4 sm:px-7">
        {results.error ? (
          <p className="py-10 text-center text-sm text-red-300">
            {results.error instanceof ApiError ? results.error.message : 'Search failed'}
          </p>
        ) : results.data && results.data.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {results.data.map((item) => (
              <button
                key={`${item.source}-${item.externalId}`}
                type="button"
                onClick={() => onPick(item)}
                className="group text-left"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/10 transition group-hover:ring-brand/60">
                  <Poster kind={item.kind} title={item.title} url={item.posterUrl} className="transition duration-300 group-hover:scale-105" />
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{item.title}</p>
                <p className="text-[11px] text-muted">
                  {[item.year, item.episodes ? `${item.episodes} eps` : null].filter(Boolean).join(' · ')}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            {!searchable
              ? 'You can still add it by hand.'
              : debounced.trim().length < 2
                ? 'Start typing to search.'
                : results.isFetching
                  ? 'Searching…'
                  : 'No matches.'}
          </p>
        )}
      </div>

      <div className="border-t border-line/60 px-5 py-3 text-center text-sm sm:px-7">
        <button type="button" onClick={onManual} className="text-muted transition hover:text-text">
          Can't find it? <span className="text-brand">Add it manually</span>
        </button>
      </div>
    </div>
  )
}

type FormState = {
  title: string
  year: string
  posterUrl: string
  status: LogStatus
  rating: number | null
  platform: Platform | null
  console: string
  progress: string
  hours: string
  startedOn: string
  finishedOn: string
  notes: string
}

function initialForm(entry: LogEntry | null): FormState {
  return {
    title: '',
    year: '',
    posterUrl: '',
    status: entry?.status ?? 'COMPLETED',
    rating: entry?.rating ?? null,
    platform: entry?.platform ?? null,
    console: entry?.console ?? '',
    progress: entry?.progress != null ? String(entry.progress) : '',
    hours: entry?.hours != null ? String(entry.hours) : '',
    startedOn: entry?.startedOn ?? '',
    finishedOn: entry?.finishedOn ?? '',
    notes: entry?.notes ?? '',
  }
}

const inputClass =
  'w-full rounded-xl border border-line bg-ink/60 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-4 focus:ring-brand/15'

function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted ${className}`}>{children}</span>
}

function EntryForm({
  kind,
  picked,
  entry,
  onBack,
  onDone,
  kindSwitcher,
}: {
  kind: MediaKind
  picked: CatalogItem | null
  entry: LogEntry | null
  onBack?: () => void
  onDone: () => void
  kindSwitcher: ReactNode
}) {
  const [form, setForm] = useState(() => initialForm(entry))
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = useSaveLog()
  const remove = useDeleteLog()
  const isManual = !picked
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const title = picked?.title ?? (form.title || `New ${kindMeta[kind].label.toLowerCase()}`)
  const episodes = picked?.episodes ?? null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (kind === 'GAME' && !form.platform) {
      setError('Pick the platform you played it on')
      return
    }
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    const input: LogInput = {
      status: form.status,
      rating: form.rating,
      platform: kind === 'GAME' ? form.platform : null,
      console: kind === 'GAME' ? form.console || null : null,
      progress: kind === 'ANIME' ? num(form.progress) : null,
      hours: kind === 'GAME' ? num(form.hours) : null,
      startedOn: form.startedOn || null,
      finishedOn: form.finishedOn || null,
      notes: form.notes || null,
    }
    if (!entry) {
      input.media = isManual
        ? { source: 'MANUAL', kind, title: form.title.trim(), year: num(form.year), posterUrl: form.posterUrl.trim() || null }
        : { source: picked.source, externalId: picked.externalId }
    }
    try {
      await save.mutateAsync({ id: entry?.id, input })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save')
    }
  }

  async function onDelete() {
    if (!entry) return
    try {
      await remove.mutateAsync(entry.id)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete')
    }
  }

  const backdrop = picked?.backdropUrl ?? picked?.posterUrl ?? null

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
      <div className="relative shrink-0 overflow-hidden">
        {backdrop && (
          <img src={backdrop} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-md" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface" />
        <div className="relative flex gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          {onBack && (
            <button type="button" onClick={onBack} aria-label="Back to search" className="absolute left-3 top-3 rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-text">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className={`aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 sm:w-24 ${onBack ? 'mt-6' : ''}`}>
            <Poster kind={kind} title={title} url={picked?.posterUrl ?? (form.posterUrl || null)} />
          </div>
          <div className={`min-w-0 flex-1 pr-8 ${onBack ? 'mt-6' : ''}`}>
            {kindSwitcher && <div className="mb-3">{kindSwitcher}</div>}
            <p className={`text-xs font-semibold uppercase tracking-wider ${kindMeta[kind].accent}`}>{kindMeta[kind].label}</p>
            <h2 className="mt-0.5 line-clamp-2 font-display text-xl font-semibold leading-tight">{title}</h2>
            {picked && (
              <p className="mt-1 text-sm text-muted">
                {[picked.year, episodes ? `${episodes} episodes` : null, picked.genres.slice(0, 3).join(', ') || null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {picked?.overview && <p className="mt-2 line-clamp-2 text-xs text-muted/80">{picked.overview}</p>}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-5 sm:px-7">
        {error && (
          <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">
            {error}
          </div>
        )}

        {isManual && !entry && (
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <label>
              <Label>Title</Label>
              <input required autoFocus maxLength={300} value={form.title} onChange={(e) => set('title', e.target.value)} className={inputClass} placeholder="e.g. God of War II" />
            </label>
            <label>
              <Label>Year</Label>
              <input type="number" min={1900} max={2100} value={form.year} onChange={(e) => set('year', e.target.value)} className={inputClass} placeholder="2007" />
            </label>
            <label className="sm:col-span-2">
              <Label>Cover image link (optional)</Label>
              <input type="url" value={form.posterUrl} onChange={(e) => set('posterUrl', e.target.value)} className={inputClass} placeholder="https://…" />
            </label>
          </div>
        )}

        <div>
          <Label>Status</Label>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set('status', s)}
                className={`rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${
                  form.status === s ? 'bg-brand text-ink ring-brand' : 'bg-ink/50 text-muted ring-line hover:text-text'
                }`}
              >
                {statusLabel(kind, s)}
              </button>
            ))}
          </div>
        </div>

        {kind === 'GAME' && (
          <div>
            <Label>Platform</Label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('platform', p)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${
                    form.platform === p ? platformMeta[p].style : 'bg-ink/50 text-muted ring-line hover:text-text'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${platformMeta[p].dot}`} />
                  {platformMeta[p].label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label>
                <Label>Console / store</Label>
                <input
                  list="console-suggestions"
                  maxLength={40}
                  value={form.console}
                  onChange={(e) => set('console', e.target.value)}
                  className={inputClass}
                  placeholder={form.platform ? consoleSuggestions[form.platform][0] ?? '' : 'PS2, Xbox 360, Steam…'}
                />
                <datalist id="console-suggestions">
                  {(form.platform ? consoleSuggestions[form.platform] : []).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
              <label>
                <Label>Hours played</Label>
                <input type="number" min={0} step={0.5} value={form.hours} onChange={(e) => set('hours', e.target.value)} className={inputClass} placeholder="0" />
              </label>
            </div>
          </div>
        )}

        {kind === 'ANIME' && (
          <label className="block max-w-[14rem]">
            <Label>Episodes watched</Label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={episodes ?? undefined}
                value={form.status === 'COMPLETED' && episodes ? String(episodes) : form.progress}
                disabled={form.status === 'COMPLETED' && !!episodes}
                onChange={(e) => set('progress', e.target.value)}
                className={`${inputClass} disabled:opacity-60`}
                placeholder="0"
              />
              {episodes && <span className="shrink-0 text-sm text-muted">/ {episodes}</span>}
            </div>
          </label>
        )}

        <div>
          <Label>Rating</Label>
          <StarRating value={form.rating} onChange={(v) => set('rating', v)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <Label>Started</Label>
            <input type="date" value={form.startedOn} onChange={(e) => set('startedOn', e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
          </label>
          <label>
            <Label>Finished</Label>
            <input type="date" value={form.finishedOn} onChange={(e) => set('finishedOn', e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
          </label>
        </div>

        <label className="block">
          <Label>Notes</Label>
          <textarea rows={3} maxLength={4000} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={`${inputClass} resize-y`} placeholder="Thoughts, favourite moments…" />
        </label>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line/60 px-5 py-3.5 sm:px-7">
        {entry ? (
          confirmDelete ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-muted">Remove from log?</span>
              <button type="button" onClick={onDelete} disabled={remove.isPending} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-red-200 ring-1 ring-red-400/40 hover:bg-red-500/30">
                Remove
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1.5 text-muted hover:text-text">
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted transition hover:text-red-300">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-5 py-2.5 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {entry ? 'Save changes' : 'Add to log'}
        </button>
      </div>
    </form>
  )
}
