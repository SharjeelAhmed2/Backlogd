import { motion } from 'motion/react'
import { Clapperboard, Gamepad2, Sparkles, Tv, ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '../components/Logo'

const sources = [
  { name: 'Letterboxd', color: 'bg-film' },
  { name: 'MyAnimeList', color: 'bg-anime' },
  { name: 'Steam', color: 'bg-steam' },
  { name: 'PlayStation', color: 'bg-psn' },
  { name: 'Xbox', color: 'bg-xbox' },
]

type Tile = { kind: 'film' | 'anime' | 'game'; title: string; meta: string; hue: string }

const tiles: Tile[] = [
  { kind: 'film', title: 'Night Drive', meta: '★ 4.5', hue: 'from-fuchsia-500/50 to-indigo-700/40' },
  { kind: 'game', title: 'Ashen Crown', meta: '112 h', hue: 'from-amber-500/50 to-red-800/40' },
  { kind: 'anime', title: 'Starfall Season 2', meta: '24 / 24 eps', hue: 'from-sky-400/50 to-blue-800/40' },
  { kind: 'film', title: 'The Long Quiet', meta: '★ 4.0', hue: 'from-emerald-400/40 to-teal-800/40' },
  { kind: 'game', title: 'Neon Circuit', meta: '38 h', hue: 'from-cyan-400/50 to-violet-800/40' },
  { kind: 'anime', title: 'Paper Moon Café', meta: '12 / 12 eps', hue: 'from-rose-400/50 to-purple-800/40' },
  { kind: 'film', title: 'Glass Harbor', meta: '★ 3.5', hue: 'from-orange-400/40 to-pink-800/40' },
  { kind: 'game', title: 'Hollow Signal', meta: '64 h', hue: 'from-lime-400/40 to-emerald-900/40' },
  { kind: 'anime', title: 'Iron Bloom', meta: '9 / 25 eps', hue: 'from-violet-400/50 to-slate-800/40' },
]

const kindIcon = { film: Clapperboard, anime: Tv, game: Gamepad2 }

function PosterColumn({ items, duration, offset }: { items: Tile[]; duration: number; offset: string }) {
  const loop = [...items, ...items]
  return (
    <div className={`relative ${offset}`}>
      <motion.div
        className="flex flex-col gap-4"
        animate={{ y: ['0%', '-50%'] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {loop.map((t, i) => {
          const Icon = kindIcon[t.kind]
          return (
            <div
              key={i}
              className={`relative aspect-[2/3] w-36 overflow-hidden rounded-2xl bg-gradient-to-br ${t.hue} ring-1 ring-white/10 sm:w-40`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
              <Icon className="absolute right-3 top-3 h-4 w-4 text-white/70" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="font-display text-sm font-semibold leading-tight">{t.title}</p>
                <p className="mt-0.5 text-xs text-white/60">{t.meta}</p>
              </div>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="rounded-full px-4 py-2 text-sm text-muted transition hover:text-text">
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-full bg-text px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Films · Anime · Games — one log
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Every film.
            <br />
            Every episode.
            <br />
            <span className="text-gradient">Every boss fight.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Pull your Letterboxd diary, MyAnimeList and Steam library into one beautiful timeline — and add every
            console classic you ever played, from PS2 to today.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-6 py-3 font-medium text-ink shadow-[0_0_40px_-8px] shadow-brand/60 transition hover:brightness-110"
            >
              Start your log <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link to="/login" className="rounded-full px-5 py-3 text-sm text-muted transition hover:text-text">
              I already have an account
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {sources.map((s) => (
              <span key={s.name} className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                {s.name}
              </span>
            ))}
          </div>
        </motion.div>

        <div className="relative hidden h-[560px] justify-center gap-4 overflow-hidden sm:flex [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]">
          <PosterColumn items={tiles.slice(0, 3)} duration={26} offset="mt-0" />
          <PosterColumn items={tiles.slice(3, 6)} duration={32} offset="mt-16" />
          <PosterColumn items={tiles.slice(6, 9)} duration={22} offset="-mt-8" />
        </div>
      </main>
    </div>
  )
}
