import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { navItems } from './nav'

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const title = useMemo(() => {
    const found = navItems.find((i) => i.to === location.pathname)
    if (found) return found.label
    if (location.pathname === '/') return 'Overview'
    return 'Dashboard'
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-200 lg:hidden"
            title="Menu"
            onClick={() => {
              // Mobile sidebar can be added later; keep button for UX parity.
              alert('Sidebar is available on desktop. Mobile drawer can be enabled as a follow-up.')
            }}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-slate-400">Live analytics from your SQL database</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="hidden rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70 sm:inline"
          >
            Home
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
            onClick={() => {
              navigate('/')
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </header>
  )
}

