import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { KpiCard } from '../components/ui/KpiCard'
import { Card } from '../components/ui/Card'
import { downloadCsv, downloadXlsx } from '../lib/export'
import { fetchFinance } from '../lib/api'
import { mockFinance } from '../data/mock'

export function FinancePage() {
  const [filters, setFilters] = useState<Filters>({})
  const [data, setData] = useState<any>(() => mockFinance(filters))

  useEffect(() => {
    fetchFinance(filters).then(setData).catch(() => setData(mockFinance(filters)))
  }, [filters])

  const k = data?.kpis ?? {}
  const trend = data?.charts?.cashflowTrend ?? []
  const profitPerUser = data?.charts?.profitPerUserTop ?? []

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} showUser />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total deposits" value={fmtMoney(k.totalDeposits)} />
        <KpiCard label="Total withdrawals" value={fmtMoney(k.totalWithdrawals)} />
        <KpiCard label="Net inflow/outflow" value={fmtMoney(k.netInflowOutflow)} />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Revenue / cashflow trend</div>
          <div className="flex gap-2">
            <button
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
              onClick={() => downloadCsv('cashflow_trend.csv', trend)}
            >
              Export CSV
            </button>
            <button
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
              onClick={() => downloadXlsx('cashflow_trend.xlsx', trend, 'cashflow')}
            >
              Export Excel
            </button>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div className="mb-3 text-sm font-semibold text-white">Profit per user</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitPerUser}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="userKey" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              <Bar dataKey="pnl" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function fmtMoney(v: any) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

