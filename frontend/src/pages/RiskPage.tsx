import { useEffect, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { KpiCard } from '../components/ui/KpiCard'
import { Card } from '../components/ui/Card'
import { DataTable } from '../components/ui/DataTable'
import { fetchRisk } from '../lib/api'
import { mockRisk } from '../data/mock'

export function RiskPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [data, setData] = useState<any>(() => mockRisk(filters))

  useEffect(() => {
    fetchRisk(filters).then(setData).catch(() => setData(mockRisk(filters)))
  }, [filters])

  const k = data?.kpis ?? {}
  const equity = data?.charts?.equityCurve ?? []
  const alerts = data?.alerts ?? []

  const marginUsers = (alerts.find((a: any) => a.type === 'margin_call_risk')?.users ?? []) as Array<{
    userKey: string
    minMarginLevel: number
  }>
  const losingUsers = (alerts.find((a: any) => a.type === 'losing_streak')?.users ?? []) as Array<{
    userKey: string
    maxLosingStreak: number
  }>

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} showUser />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Maximum drawdown" value={fmtNum(k.maximumDrawdown)} subValue="Risk KPI (mocked)" />
        <KpiCard label="Avg leverage" value={fmtNum(k.avgLeverage)} />
        <KpiCard label="Min margin level" value={fmtNum(k.minMarginLevel)} subValue="Alert threshold concept" />
        <KpiCard label="Avg margin/equity" value={fmtNum(k.avgMarginToEquity)} />
      </div>

      <Card>
        <div className="mb-3 text-sm font-semibold text-white">Equity curve</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equity}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              <Line type="monotone" dataKey="equity" stroke="#fb7185" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DataTable
          title="Margin call alerts"
          columns={[
            { key: 'userKey', label: 'User' },
            { key: 'minMarginLevel', label: 'Min Margin Level', render: (r) => fmtNum(r.minMarginLevel) },
          ]}
          rows={marginUsers}
        />
        <DataTable
          title="Losing streak detection"
          columns={[
            { key: 'userKey', label: 'User' },
            { key: 'maxLosingStreak', label: 'Max Losing Streak' },
          ]}
          rows={losingUsers}
        />
      </div>
    </div>
  )
}

function fmtNum(v: any) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

