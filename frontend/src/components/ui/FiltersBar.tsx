import { Card } from './Card'

export type Filters = {
  start?: string
  end?: string
  user?: string
  instrument?: string
}

export function FiltersBar({
  value,
  onChange,
  showUser = false,
  showInstrument = false,
}: {
  value: Filters
  onChange: (next: Filters) => void
  showUser?: boolean
  showInstrument?: boolean
}) {
  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs text-slate-400">Start (YYYY-MM-DD)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            placeholder="2026-01-01"
            value={value.start ?? ''}
            onChange={(e) => onChange({ ...value, start: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">End (YYYY-MM-DD)</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
            placeholder="2026-04-15"
            value={value.end ?? ''}
            onChange={(e) => onChange({ ...value, end: e.target.value || undefined })}
          />
        </div>
        {showUser ? (
          <div>
            <label className="text-xs text-slate-400">User</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              placeholder="login / user_id"
              value={value.user ?? ''}
              onChange={(e) => onChange({ ...value, user: e.target.value || undefined })}
            />
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
        {showInstrument ? (
          <div>
            <label className="text-xs text-slate-400">Instrument</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
              placeholder="EURUSD / XAUUSD"
              value={value.instrument ?? ''}
              onChange={(e) => onChange({ ...value, instrument: e.target.value || undefined })}
            />
          </div>
        ) : (
          <div className="hidden lg:block" />
        )}
      </div>
    </Card>
  )
}

