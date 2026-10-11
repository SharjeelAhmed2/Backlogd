import { Link } from 'react-router'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5">
      <span className="flex h-8 items-end gap-[3px] rounded-lg bg-surface-2 px-2 pb-1.5 pt-1.5 ring-1 ring-line">
        <span className="h-4 w-1.5 rounded-sm bg-brand transition-all group-hover:h-5" />
        <span className="h-3 w-1.5 rounded-sm bg-brand/75 transition-all group-hover:h-4" />
        <span className="h-2 w-1.5 rounded-sm bg-brand-2/60 transition-all group-hover:h-3" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        backlog<span className="text-gradient">d</span>
      </span>
    </Link>
  )
}
