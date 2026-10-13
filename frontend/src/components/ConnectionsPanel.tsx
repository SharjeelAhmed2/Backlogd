import { AnimatePresence, motion } from 'motion/react'
import { Check, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { useConnections, useDisconnect, useMalImport, type ImportResult } from '../lib/connections'
import { relativeTime } from '../lib/labels'

const comingSoon = [
  { name: 'Letterboxd', how: 'CSV import + RSS', dot: 'bg-film' },
  { name: 'Steam', how: 'Sign in with Steam', dot: 'bg-steam' },
  { name: 'PlayStation', how: 'Manual logging', dot: 'bg-psn' },
  { name: 'Xbox', how: 'Manual logging', dot: 'bg-xbox' },
]

function summarize(r: ImportResult) {
  const parts = [`${r.imported} imported`]
  if (r.alreadyLogged) parts.push(`${r.alreadyLogged} already in your log`)
  if (r.notOnAniList) parts.push(`${r.notOnAniList} kept with MAL artwork`)
  return parts.join(' · ')
}

function MalRow() {
  const { data } = useConnections()
  const malImport = useMalImport()
  const disconnect = useDisconnect()
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const available = data?.available.MAL ?? false
  const linked = data?.connections.find((c) => c.provider === 'MAL')
  const busy = malImport.isPending

  async function run(name: string) {
    setError(null)
    setResult(null)
    try {
      const r = await malImport.mutateAsync(name)
      setResult(summarize(r))
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (username.trim()) run(username.trim())
  }

  return (
    <li className="rounded-xl bg-ink/40 px-4 py-3 ring-1 ring-line/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-anime" />
          <div className="min-w-0">
            <p className="text-sm font-medium">MyAnimeList</p>
            <p className="truncate text-xs text-muted">
              {linked
                ? `@${linked.account}${linked.lastSyncedAt ? ` · synced ${relativeTime(linked.lastSyncedAt)}` : ''}`
                : available
                  ? 'Import your anime list'
                  : 'Needs MAL_CLIENT_ID in backend/.env'}
            </p>
          </div>
        </div>
        {linked ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => run(linked.account)}
              disabled={busy || !available}
              title="Sync now"
              className="inline-flex items-center gap-1 rounded-full bg-anime/15 px-2.5 py-1 text-[11px] font-medium text-[#9db4ff] ring-1 ring-anime/40 transition hover:bg-anime/25 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Syncing' : 'Sync'}
            </button>
            <button
              onClick={() => disconnect.mutate('MAL')}
              disabled={busy}
              title="Disconnect (keeps imported entries)"
              aria-label="Disconnect MyAnimeList"
              className="rounded-full p-1.5 text-muted transition hover:text-red-300"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={!available}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-text ring-1 ring-line transition hover:ring-anime/60 disabled:text-muted disabled:opacity-60"
          >
            <Link2 className="h-3 w-3" /> {available ? 'Connect' : 'Setup'}
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && !linked && (
          <motion.form
            onSubmit={onSubmit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex gap-2">
              <input
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="MAL username"
                maxLength={16}
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink/60 px-3 py-1.5 text-sm outline-none focus:border-anime"
              />
              <button
                type="submit"
                disabled={busy || !username.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-anime px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Import
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted">Your list must be public. Already-logged titles are skipped.</p>
          </motion.form>
        )}
      </AnimatePresence>

      {busy && <p className="mt-2 text-xs text-muted">Importing… big lists can take up to a minute.</p>}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {!busy && (result ?? linked?.lastSummary) && (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-film">
          <Check className="h-3 w-3" /> {result ?? linked?.lastSummary}
        </p>
      )}
    </li>
  )
}

export function ConnectionsPanel() {
  return (
    <section className="glass h-fit rounded-3xl p-6">
      <h2 className="font-display text-lg font-semibold">Connections</h2>
      <ul className="mt-4 space-y-2">
        <MalRow />
        {comingSoon.map((c) => (
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
  )
}
