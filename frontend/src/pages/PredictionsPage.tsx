import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, RadialBarChart, RadialBar, Legend,
} from 'recharts'
import {
  TrendingUp, Users, ShieldAlert, DollarSign, Activity, RefreshCw, Brain,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { KpiCard } from '../components/ui/KpiCard'
import { Card } from '../components/ui/Card'
import { mockPredictions } from '../data/mock'

const COLORS = ['#a78bfa', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#94a3b8']

function fmtMoney(v: number) {
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

function RiskBadge({ score }: { score: number }) {
  if (score >= 1.5) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
      <AlertTriangle className="h-3 w-3" /> High
    </span>
  )
  if (score >= 1.2) return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
      <AlertTriangle className="h-3 w-3" /> Medium
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
      <CheckCircle className="h-3 w-3" /> Low
    </span>
  )
}

export function PredictionsPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const data = useMemo(() => mockPredictions(filters), [filters, refreshKey])

  const tradeOutcome = data.results?.tradeOutcome
  const userChurn = data.results?.userChurn
  const revenueForecast = data.results?.revenueForecast
  const fraudDetection = data.results?.fraudDetection

  const churnTop = useMemo(() => userChurn?.top ?? [], [userChurn])
  const forecastData = useMemo(() => revenueForecast?.forecast ?? [], [revenueForecast])
  const fraudAnomalies = useMemo(() => fraudDetection?.topAnomalies ?? [], [fraudDetection])

  const churnRadial = useMemo(() =>
    churnTop.slice(0, 5).map((u: any, i: number) => ({
      name: `Rank #${u.rank}`,
      churn: Math.round(u.churnProb * 100),
      fill: COLORS[i % COLORS.length],
    })),
    [churnTop]
  )

  function handleRefresh() {
    setIsRefreshing(true)
    setTimeout(() => {
      setRefreshKey(k => k + 1)
      setLastRefreshed(new Date().toLocaleTimeString())
      setIsRefreshing(false)
    }, 800)
  }

  const profitProb = tradeOutcome?.avgProbProfitable ?? 0
  const isProfitPositive = profitProb >= 0.5

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <div className="text-base font-semibold text-white">Predictions & Insights</div>
            <div className="text-xs text-slate-400">
              AI-powered analytics · {lastRefreshed ? `Last updated ${lastRefreshed}` : 'Live mock models'}
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing…' : 'Refresh Models'}
        </button>
      </Card>

      <FiltersBar value={filters} onChange={setFilters} />

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Avg Profitable Trade Probability"
          value={fmtPct(profitProb)}
          subValue={isProfitPositive ? '▲ Above 50% threshold' : '▼ Below 50% threshold'}
          icon={
            isProfitPositive
              ? <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              : <ArrowDownRight className="h-5 w-5 text-red-400" />
          }
        />
        <KpiCard
          label="Trade Outcome Samples"
          value={(tradeOutcome?.samples ?? 0).toLocaleString()}
          subValue="Trades used for prediction"
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          label="Top Churn Risk Users"
          value={churnTop.length}
          subValue={`Highest: ${churnTop[0] ? fmtPct(churnTop[0].churnProb) : '—'} churn probability`}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Fraud Anomalies Detected"
          value={fraudAnomalies.length}
          subValue={`Top score: ${fraudAnomalies[0] ? fraudAnomalies[0].anomalyScore.toFixed(2) : '—'}`}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
      </div>

      {/* Row 1: Trade Outcome + Revenue Forecast */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Trade Outcome */}
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Trade Outcome Prediction</div>
              <div className="text-xs text-slate-400">Probability a trade will be profitable (LogisticRegression)</div>
            </div>
            <TrendingUp className="h-5 w-5 text-violet-400" />
          </div>

          <div className="mt-4 flex items-center gap-4">
            {/* Gauge-style ring */}
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="50" stroke="#1e293b" strokeWidth="12" fill="none" />
                <circle
                  cx="60" cy="60" r="50"
                  stroke={isProfitPositive ? '#34d399' : '#fb7185'}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${profitProb * 314} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <div className={`text-xl font-bold ${isProfitPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtPct(profitProb)}
                </div>
                <div className="text-xs text-slate-400">Win Rate</div>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="rounded-xl bg-slate-800/50 p-3">
                <div className="text-xs text-slate-400">Model</div>
                <div className="text-sm font-medium text-white">Logistic Regression</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3">
                <div className="text-xs text-slate-400">Training Samples</div>
                <div className="text-sm font-medium text-white">{(tradeOutcome?.samples ?? 0).toLocaleString()} trades</div>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3">
                <div className="text-xs text-slate-400">Features Used</div>
                <div className="text-sm font-medium text-white">Symbol · Volume · Hour · Side</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 p-3">
            <div className="mb-2 text-xs text-slate-400">Win / Loss Split</div>
            <div className="flex h-3 overflow-hidden rounded-full">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${profitProb * 100}%` }}
              />
              <div className="flex-1 bg-red-500/60" />
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-emerald-400">Win {fmtPct(profitProb)}</span>
              <span className="text-red-400">Loss {fmtPct(1 - profitProb)}</span>
            </div>
          </div>
        </Card>

        {/* Revenue Forecast */}
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Revenue Forecast</div>
              <div className="text-xs text-slate-400">
                Next {revenueForecast?.horizonDays ?? 14}-day broker revenue (LinearRegression)
              </div>
            </div>
            <DollarSign className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }}
                  formatter={(v: number) => [fmtMoney(v), 'Forecast Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-800/50 p-3 text-center">
              <div className="text-xs text-slate-400">Projected Peak</div>
              <div className="text-sm font-semibold text-cyan-400">
                {forecastData.length ? fmtMoney(Math.max(...forecastData.map((d: any) => d.value))) : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-800/50 p-3 text-center">
              <div className="text-xs text-slate-400">Projected Low</div>
              <div className="text-sm font-semibold text-amber-400">
                {forecastData.length ? fmtMoney(Math.min(...forecastData.map((d: any) => d.value))) : '—'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: User Churn */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Churn bar chart */}
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">User Churn Prediction</div>
              <div className="text-xs text-slate-400">Top 10 at-risk users (RandomForest · 200 trees)</div>
            </div>
            <Users className="h-5 w-5 text-amber-400" />
          </div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnTop} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  stroke="#94a3b8"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                />
                <YAxis type="category" dataKey="rank" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={(v) => `#${v}`} width={28} />
                <Tooltip
                  contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }}
                  formatter={(v: number) => [`${(v * 100).toFixed(1)}%`, 'Churn Probability']}
                />
                <Bar dataKey="churnProb" radius={[0, 6, 6, 0]}>
                  {churnTop.map((_: any, i: number) => (
                    <Cell key={i} fill={i < 3 ? '#fb7185' : i < 6 ? '#fbbf24' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Churn radial + table */}
        <Card>
          <div className="mb-1">
            <div className="text-sm font-semibold text-white">Churn Risk — Top 5 Radial</div>
            <div className="text-xs text-slate-400">Breakdown by churn probability score</div>
          </div>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="30%"
                outerRadius="90%"
                data={churnRadial}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar dataKey="churn" background={{ fill: '#1e293b' }} cornerRadius={6} label={false} />
                <Legend iconSize={8} formatter={(v) => <span className="text-xs text-slate-300">{v}</span>} />
                <Tooltip
                  contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }}
                  formatter={(v: number) => [`${v}%`, 'Churn Probability']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 divide-y divide-slate-800">
            {churnTop.slice(0, 5).map((u: any) => (
              <div key={u.rank} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs text-slate-500">#{u.rank}</span>
                  <span className="text-sm text-slate-200">{u.trades} trades</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${u.churnProb * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-amber-400">{fmtPct(u.churnProb)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Fraud Detection */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Fraud Detection — Anomaly Scores</div>
            <div className="text-xs text-slate-400">IsolationForest · 5% contamination · ranked by anomaly score</div>
          </div>
          <ShieldAlert className="h-5 w-5 text-red-400" />
        </div>

        {/* Fraud bar chart */}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fraudAnomalies}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="userKey" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 2.2]} />
              <Tooltip
                contentStyle={{ background: '#0b1220', border: '1px solid #1f2937' }}
                formatter={(v: number, name: string) => [
                  name === 'anomalyScore' ? v.toFixed(3) : fmtMoney(v),
                  name === 'anomalyScore' ? 'Anomaly Score' : 'PnL',
                ]}
              />
              <Bar dataKey="anomalyScore" radius={[6, 6, 0, 0]}>
                {fraudAnomalies.map((d: any, i: number) => (
                  <Cell key={i} fill={d.anomalyScore >= 1.5 ? '#fb7185' : d.anomalyScore >= 1.2 ? '#fbbf24' : '#34d399'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fraud table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400">User</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400">Anomaly Score</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400">Trades</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400">PnL</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-400">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {fraudAnomalies.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-violet-300">{row.userKey}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white">{row.anomalyScore.toFixed(3)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300">{row.trades.toLocaleString()}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${row.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmtMoney(row.pnl)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <RiskBadge score={row.anomalyScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row 4: Market Trend Prediction placeholder */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
            <TrendingUp className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Market Trend Prediction</div>
            <div className="mt-1 text-xs text-slate-400">
              Directional bias model for top instruments — connects to live MT4/MT5 feed when backend DB is configured.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {['EURUSD', 'XAUUSD', 'BTCUSD', 'NAS100'].map((sym, i) => {
                const bias = i % 2 === 0 ? 'Bullish' : 'Bearish'
                const conf = [72, 61, 68, 55][i]
                return (
                  <div key={sym} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-center">
                    <div className="text-xs font-semibold text-slate-300">{sym}</div>
                    <div className={`mt-1 text-sm font-bold ${bias === 'Bullish' ? 'text-emerald-400' : 'text-red-400'}`}>{bias}</div>
                    <div className="mt-1 text-xs text-slate-500">{conf}% confidence</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Footer note */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-3 text-xs text-slate-500">
        Models: <span className="text-slate-400">LogisticRegression (trade outcome) · RandomForest-200 (churn) · LinearRegression (revenue) · IsolationForest-5% (fraud)</span>
        &nbsp;·&nbsp; Data is deterministically seeded mock data — connect a live MT4/MT5 database to run real inference via <span className="font-mono text-slate-400">POST /api/predictions/train</span>.
      </div>
    </div>
  )
}
