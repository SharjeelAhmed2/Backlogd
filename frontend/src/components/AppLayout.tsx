import { Clapperboard, Gamepad2, LayoutDashboard, LogOut, Plus, Tv } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import type { LogEntry, MediaKind } from '../lib/types'
import { LogDialog, type DialogTarget } from './LogDialog'
import { Logo } from './Logo'

type LogDialogApi = {
  openCreate: (kind?: MediaKind) => void
  openEdit: (entry: LogEntry) => void
}

const LogDialogContext = createContext<LogDialogApi | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useLogDialog() {
  const ctx = useContext(LogDialogContext)
  if (!ctx) throw new Error('useLogDialog must be used inside <AppLayout>')
  return ctx
}

const nav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/films', label: 'Films', icon: Clapperboard },
  { to: '/app/anime', label: 'Anime', icon: Tv },
  { to: '/app/games', label: 'Games', icon: Gamepad2 },
]

function NavItems({ compact = false }: { compact?: boolean }) {
  return nav.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        `inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition ${
          isActive ? 'bg-surface-2 text-text ring-1 ring-line' : 'text-muted hover:text-text'
        } ${compact ? 'px-3' : ''}`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  ))
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const [target, setTarget] = useState<DialogTarget | null>(null)
  const close = useCallback(() => setTarget(null), [])
  const api: LogDialogApi = {
    openCreate: (kind = 'ANIME') => setTarget({ mode: 'create', kind }),
    openEdit: (entry) => setTarget({ mode: 'edit', entry }),
  }
  if (!user) return null

  return (
    <LogDialogContext.Provider value={api}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-6">
              <Logo to="/app" />
              <nav className="hidden items-center gap-1 md:flex">
                <NavItems />
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => api.openCreate()}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-brand-2 px-3.5 py-1.5 text-sm font-medium text-ink transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Log</span>
              </button>
              <div className="hidden text-right lg:block">
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
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2.5 md:hidden">
            <NavItems compact />
          </nav>
        </header>

        <Outlet />
      </div>
      <LogDialog target={target} onClose={close} />
    </LogDialogContext.Provider>
  )
}
