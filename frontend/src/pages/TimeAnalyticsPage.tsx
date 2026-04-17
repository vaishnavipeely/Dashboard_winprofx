import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { Card } from '../components/ui/Card'
import { fetchTime } from '../lib/api'
import { mockTime } from '../data/mock'

const PIE_COLORS = ['#22d3ee', '#a78bfa', '#34d399']

export function TimeAnalyticsPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [data, setData] = useState<any>(() => mockTime(filters))

  useEffect(() => {
    fetchTime(filters).then(setData).catch(() => setData(mockTime(filters)))
  }, [filters])

  const byHour = data?.charts?.tradesByHour ?? []
  const byDow = (data?.charts?.tradesByDayOfWeek ?? []).map((r: any) => ({ ...r, day: dowLabel(r.dow) }))
  const sessions = data?.charts?.marketSessions ?? []

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Trades by hour (UTC)</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Trades by day of week</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDow}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="day" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 text-sm font-semibold text-white">Market session analysis</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sessions} dataKey="value" nameKey="name" outerRadius={120}>
                  {sessions.map((_: any, idx: number) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

function dowLabel(dow: number) {
  // MySQL DAYOFWEEK: 1=Sun..7=Sat
  const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const idx = Math.max(1, Math.min(7, Number(dow))) - 1
  return map[idx]
}

