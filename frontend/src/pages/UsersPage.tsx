import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { KpiCard } from '../components/ui/KpiCard'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { downloadCsv, downloadXlsx } from '../lib/export'
import { fetchUsers } from '../lib/api'
import { mockUsers } from '../data/mock'

export function UsersPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [data, setData] = useState<any>(() => mockUsers(filters))

  useEffect(() => {
    fetchUsers(filters).then(setData).catch(() => setData(mockUsers(filters)))
  }, [filters])

  const k = data?.kpis ?? {}
  const newUsers = data?.charts?.newUsersDaily ?? []
  const leaderboard = data?.tables?.topTraders ?? []

  const filteredLeaderboard = useMemo(() => {
    const q = filters.user?.trim().toLowerCase()
    if (!q) return leaderboard
    return leaderboard.filter((r: any) => String(r.userKey).toLowerCase().includes(q))
  }, [leaderboard, filters.user])

  const selectedUser = filters.user?.trim() ? filteredLeaderboard[0] ?? null : null

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} showUser />

      {selectedUser && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-400">
            User Spotlight — {selectedUser.userKey}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-800/50 p-3 text-center">
              <div className="text-xs text-slate-400">Total Trades</div>
              <div className="mt-1 text-lg font-bold text-white">{selectedUser.trades}</div>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3 text-center">
              <div className="text-xs text-slate-400">Net PnL</div>
              <div className={`mt-1 text-lg font-bold ${selectedUser.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtMoney(selectedUser.pnl)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3 text-center">
              <div className="text-xs text-slate-400">Avg PnL / Trade</div>
              <div className="mt-1 text-lg font-bold text-cyan-400">
                {fmtMoney(selectedUser.pnl / (selectedUser.trades || 1))}
              </div>
            </div>
          </div>
        </div>
      )}

      {filters.user?.trim() && filteredLeaderboard.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
          No user found matching <span className="font-mono text-slate-200">"{filters.user}"</span>.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Active Users" value={k.activeUsers ?? '—'} />
        <KpiCard label="Inactive Users" value={k.inactiveUsers ?? '—'} />
        <KpiCard
          label="Retention rate"
          value={k.retentionRate == null ? '—' : `${Math.round(k.retentionRate * 100)}%`}
          subValue="Cohort-style KPI"
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">New users (daily)</div>
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
              onClick={() => downloadCsv('new_users.csv', newUsers)}
            >
              Export CSV
            </button>
            <button
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
              onClick={() => downloadXlsx('new_users.xlsx', newUsers, 'new_users')}
            >
              Export Excel
            </button>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={newUsers}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Top traders leaderboard</div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
            onClick={() => downloadCsv('top_traders.csv', leaderboard)}
          >
            Export CSV
          </button>
          <button
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
            onClick={() => downloadXlsx('top_traders.xlsx', leaderboard, 'top_traders')}
          >
            Export Excel
          </button>
        </div>
      </div>

      <DataTable
        title={filters.user?.trim() ? `Results for "${filters.user}"` : 'Top Traders (by PnL)'}
        columns={[
          { key: 'userKey', label: 'User' },
          { key: 'trades', label: 'Trades' },
          { key: 'pnl', label: 'PnL', render: (r) => fmtMoney(r.pnl) },
        ]}
        rows={filteredLeaderboard}
      />
    </div>
  )
}

function fmtMoney(v: any) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}
