import { AnimatePresence, motion } from 'motion/react'
import { Check, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'
import { useConnections, useDisconnect, useImport, type ImportResult, type Provider } from '../lib/connections'
import { relativeTime } from '../lib/labels'

type ProviderConfig = {
  provider: Provider
  name: string
  dot: string
  /** Tailwind classes for the accent button (sync / import). */
  accent: string
  envVar: string
  pitch: string
  placeholder: string
  help: string
  busyText: string
}

const importable: ProviderConfig[] = [
  {
    provider: 'MAL',
    name: 'MyAnimeList',
    dot: 'bg-anime',
    accent: 'bg-anime/15 text-[#9db4ff] ring-anime/40 hover:bg-anime/25',
    envVar: 'MAL_CLIENT_ID',
    pitch: 'Import your anime list',
    placeholder: 'MAL username',
    help: 'Your list must be public. Already-logged titles are skipped.',
    busyText: 'Importing… big lists can take up to a minute.',
  },
  {
    provider: 'STEAM',
    name: 'Steam',
    dot: 'bg-steam',
    accent: 'bg-steam/15 text-steam ring-steam/40 hover:bg-steam/25',
    envVar: 'STEAM_API_KEY',
    pitch: 'Import your library and hours',
    placeholder: 'Profile link, SteamID or custom URL',
    help: 'Game details must be public in Steam privacy settings. Syncing again refreshes hours.',
    busyText: 'Importing your library…',
  },
]

const comingSoon = [
  { name: 'Letterboxd', how: 'CSV import + RSS', dot: 'bg-film' },
  { name: 'PlayStation', how: 'Manual logging', dot: 'bg-psn' },
  { name: 'Xbox', how: 'Manual logging', dot: 'bg-xbox' },
]

function summarize(r: ImportResult) {
  const parts = [`${r.imported} imported`]
  if (r.updated) parts.push(`${r.updated} updated`)
  if (r.alreadyLogged) parts.push(`${r.alreadyLogged} already in your log`)
  if (r.notOnAniList) parts.push(`${r.notOnAniList} kept with MAL artwork`)
  return parts.join(' · ')
}

function ImportRow({ config }: { config: ProviderConfig }) {
  const { data } = useConnections()
  const runImport = useImport(config.provider)
  const disconnect = useDisconnect()
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const available = data?.available[config.provider] ?? false
  const linked = data?.connections.find((c) => c.provider === config.provider)
  const busy = runImport.isPending

  async function run(value: string) {
    setError(null)
    setResult(null)
    try {
      setResult(summarize(await runImport.mutateAsync(value)))
      setOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (account.trim()) run(account.trim())
  }

  const subtitle = linked
    ? `${linked.displayName ?? linked.account}${linked.lastSyncedAt ? ` · synced ${relativeTime(linked.lastSyncedAt)}` : ''}`
    : available
      ? config.pitch
      : `Needs ${config.envVar} in backend/.env`

  return (
    <li className="rounded-xl bg-ink/40 px-4 py-3 ring-1 ring-line/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{config.name}</p>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        {linked ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => run(linked.account)}
              disabled={busy || !available}
              title="Sync now"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition disabled:opacity-50 ${config.accent}`}
            >
              <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Syncing' : 'Sync'}
            </button>
            <button
              onClick={() => disconnect.mutate(config.provider)}
              disabled={busy}
              title="Disconnect (keeps imported entries)"
              aria-label={`Disconnect ${config.name}`}
              className="rounded-full p-1.5 text-muted transition hover:text-red-300"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            disabled={!available}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-text ring-1 ring-line transition hover:ring-brand/60 disabled:text-muted disabled:opacity-60"
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
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={config.placeholder}
                maxLength={200}
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink/60 px-3 py-1.5 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={busy || !account.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-2 px-3 py-1.5 text-sm font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Import
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted">{config.help}</p>
          </motion.form>
        )}
      </AnimatePresence>

      {busy && <p className="mt-2 text-xs text-muted">{config.busyText}</p>}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {!busy && !error && (result ?? linked?.lastSummary) && (
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
        {importable.map((c) => (
          <ImportRow key={c.provider} config={c} />
        ))}
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
