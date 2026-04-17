import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Activity, DollarSign, Users } from 'lucide-react'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { KpiCard } from '../components/ui/KpiCard'
import { Card } from '../components/ui/Card'
import { fetchOverview } from '../lib/api'
import { mockOverview } from '../data/mock'

const PIE_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#94a3b8']

export function OverviewPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [data, setData] = useState<any>(() => mockOverview(filters))

  useEffect(() => {
    fetchOverview(filters).then(setData).catch(() => setData(mockOverview(filters)))
  }, [filters])

  const k = data?.kpis ?? {}
  const charts = data?.charts ?? {}

  const volumePie: any[] = Array.isArray(charts.volumeDistribution) ? charts.volumeDistribution : []

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Users" value={k.totalUsers ?? '—'} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Active Traders" value={k.activeTraders ?? '—'} icon={<Activity className="h-5 w-5" />} />
        <KpiCard label="Total Trades Today" value={k.totalTradesToday ?? '—'} icon={<Activity className="h-5 w-5" />} />
        <KpiCard label="Total Volume" value={fmtNum(k.totalVolume)} icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard label="Total Profit/Loss" value={fmtMoney(k.totalProfitLoss)} icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard label="Broker Revenue (commission/spread)" value={fmtMoney(k.brokerRevenue)} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Profit/Loss over time</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.profitLossOverTime ?? []}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Trades per day</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.tradesPerDay ?? []}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Volume distribution</div>
          <div className="text-xs text-slate-400">Sample instrument mix</div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={volumePie} dataKey="value" nameKey="name" outerRadius={120}>
                {volumePie.map((_: any, idx: number) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

function fmtNum(v: any) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function fmtMoney(v: any) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

