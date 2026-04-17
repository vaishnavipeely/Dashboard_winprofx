import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { Card } from '../components/ui/Card'
import { fetchInstruments } from '../lib/api'
import { mockInstruments } from '../data/mock'

export function InstrumentsPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [data, setData] = useState<any>(() => mockInstruments(filters))

  useEffect(() => {
    fetchInstruments(filters).then(setData).catch(() => setData(mockInstruments(filters)))
  }, [filters])

  const mostTraded = data?.charts?.mostTraded ?? []
  const volume = data?.charts?.volumePerInstrument ?? []
  const pnl = data?.charts?.profitPerInstrument ?? []

  return (
    <div className="space-y-4">
      <FiltersBar value={filters} onChange={setFilters} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Most traded instruments</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mostTraded}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-white">Volume per instrument</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="value" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 text-sm font-semibold text-white">Profit per instrument</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnl}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }} />
                <Bar dataKey="value" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

