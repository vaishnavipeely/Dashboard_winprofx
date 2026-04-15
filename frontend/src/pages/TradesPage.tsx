import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { KpiCard } from '../components/ui/KpiCard'
import { Card } from '../components/ui/Card'
import { mockTrades } from '../data/mock'

const PIE_COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa']

export function TradesPage() {
  const [filters, setFilters] = useState<Filters>({})
  const data = useMemo(() => mockTrades(filters), [filters])

  const k = data?.kpis ?? {}
  const buySell = data?.charts?.buySell ?? []
  const tradesOverTime = data?.charts?.tradesOverTime ?? []
  const topInstr = data?.charts?.topInstrumentsByTrades ?? []

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} showUser showInstrument />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total trades" value={k.totalTrades ?? '—'} />
        <KpiCard label="Win rate" value={k.winRate == null ? '—' : `${Math.round(k.winRate * 100)}%`} />
        <KpiCard label="Loss rate" value={k.lossRate == null ? '—' : `${Math.round(k.lossRate * 100)}%`} />
        <KpiCard label="Average trade size" value={fmtNum(k.avgTradeSize)} />
        <KpiCard label="Trade frequency per user" value={fmtNum(k.tradeFrequencyPerUser)} />
        <KpiCard label="Unique traders" value={k.uniqueTraders ?? '—'} />
        <KpiCard label="Open trades" value={k.openTrades ?? '—'} />
        <KpiCard label="Closed trades" value={k.closedTrades ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Trades over time</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tradesOverTime}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Buy vs Sell</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={buySell} dataKey="value" nameKey="name" outerRadius={110}>
                  {buySell.map((_: any, idx: number) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 text-sm font-semibold text-white">Most traded instruments</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topInstr}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
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

