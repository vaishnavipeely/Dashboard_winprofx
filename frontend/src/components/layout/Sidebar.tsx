import { NavLink } from 'react-router-dom'
import { navItems } from './nav'
import clsx from 'clsx'

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-800 bg-slate-950/80 backdrop-blur lg:block">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">WinproFX</div>
            <div className="text-xs text-slate-400">Analytics Dashboard</div>
          </div>
        </div>
      </div>
      <nav className="px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                isActive
                  ? 'bg-slate-800/60 text-white'
                  : 'text-slate-300 hover:bg-slate-900/60 hover:text-white',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

