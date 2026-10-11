import { motion } from 'motion/react'
import { Clapperboard, Clock, Gamepad2, LogOut, Plus, Tv, Link2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'

const stats = [
  { label: 'Films logged', value: 0, icon: Clapperboard, accent: 'text-film' },
  { label: 'Anime episodes', value: 0, icon: Tv, accent: 'text-anime' },
  { label: 'Games played', value: 0, icon: Gamepad2, accent: 'text-steam' },
  { label: 'Hours tracked', value: 0, icon: Clock, accent: 'text-brand' },
]

const connections = [
  { name: 'Letterboxd', how: 'CSV import + RSS', dot: 'bg-film' },
  { name: 'MyAnimeList', how: 'Sign in with MAL', dot: 'bg-anime' },
  { name: 'Steam', how: 'Sign in with Steam', dot: 'bg-steam' },
  { name: 'PlayStation', how: 'Manual logging', dot: 'bg-psn' },
  { name: 'Xbox', how: 'Manual logging', dot: 'bg-xbox' },
]

export function Dashboard() {
  const { user, logout } = useAuth()
  if (!user) return null
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Late night session' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo to="/app" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.displayName}</p>
              <p className="text-xs text-muted">@{user.username}</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 font-display text-sm font-bold text-ink">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              className="rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-text"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{user.displayName}</h1>
        </motion.div>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass rounded-2xl p-4 sm:p-5"
            >
              <s.icon className={`h-5 w-5 ${s.accent}`} />
              <p className="mt-4 font-display text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </motion.div>
          ))}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Timeline</h2>
              <button className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm ring-1 ring-line transition hover:ring-brand/60">
                <Plus className="h-4 w-4" /> Log something
              </button>
            </div>
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
              <p className="mt-5 font-medium">Your timeline is empty</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Connect a source or log your first title. Everything you watch and play will show up here.
              </p>
            </div>
          </section>

          <section className="glass rounded-3xl p-6">
            <h2 className="font-display text-lg font-semibold">Connections</h2>
            <ul className="mt-4 space-y-2">
              {connections.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between rounded-xl bg-ink/40 px-4 py-3 ring-1 ring-line/70"
                >
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
    </div>
  )
}
