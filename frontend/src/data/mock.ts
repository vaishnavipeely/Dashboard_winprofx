import type { Filters } from '../components/ui/FiltersBar'

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromFilters(filters: Filters) {
  const s = `${filters.start ?? ''}|${filters.end ?? ''}|${filters.user ?? ''}|${filters.instrument ?? ''}`
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function dateRange(filters: Filters, fallbackDays: number) {
  const now = new Date()
  const end = filters.end ? new Date(filters.end) : now
  const start = filters.start ? new Date(filters.start) : new Date(end.getTime() - fallbackDays * 24 * 3600 * 1000)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const e = now
    const s = new Date(now.getTime() - fallbackDays * 24 * 3600 * 1000)
    return { start: s, end: e }
  }
  return { start, end }
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 3600 * 1000
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / ms))
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function mockOverview(filters: Filters) {
  const seed = seedFromFilters(filters)
  const rnd = mulberry32(seed)
  const { start, end } = dateRange(filters, 30)
  const nDays = clamp(daysBetween(start, end), 7, 120)

  const totalUsers = Math.round(12000 + rnd() * 8000)
  const activeTraders = Math.round(totalUsers * (0.22 + rnd() * 0.12))
  const totalTradesToday = Math.round(900 + rnd() * 1200)
  const totalVolume = Math.round(4_500_000 + rnd() * 9_000_000)
  const totalProfitLoss = Math.round((-180_000 + rnd() * 420_000) * 100) / 100
  const brokerRevenue = Math.round((65_000 + rnd() * 85_000) * 100) / 100

  let pnl = 0
  const profitLossOverTime = []
  const tradesPerDay = []
  for (let i = 0; i < nDays; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000)
    const dailyPnl = (rnd() - 0.45) * 35_000
    pnl += dailyPnl
    profitLossOverTime.push({ date: fmtDate(d), value: Math.round(dailyPnl * 100) / 100 })
    tradesPerDay.push({ date: fmtDate(d), value: Math.round(800 + rnd() * 900) })
  }

  const instruments = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'USOIL', 'BTCUSD', 'NAS100', 'SPX500']
  const volumeDistribution = instruments
    .map((name) => ({ name, value: Math.round((0.6 + rnd() * 2.4) * 1000) / 10 }))
    .sort((a, b) => b.value - a.value)

  return {
    kpis: { totalUsers, activeTraders, totalTradesToday, totalVolume, totalProfitLoss, brokerRevenue },
    charts: { profitLossOverTime, tradesPerDay, volumeDistribution },
  }
}

export function mockUsers(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0x9e3779b9
  const rnd = mulberry32(seed)
  const { start, end } = dateRange(filters, 90)
  const nDays = clamp(daysBetween(start, end), 14, 180)

  const activeUsers = Math.round(3200 + rnd() * 2100)
  const inactiveUsers = Math.round(7400 + rnd() * 2600)
  const retentionRate = Math.round((0.42 + rnd() * 0.22) * 1000) / 1000

  const newUsersDaily = Array.from({ length: nDays }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000)
    return { date: fmtDate(d), value: Math.round(25 + rnd() * 90) }
  })

  const topTraders = Array.from({ length: 20 }, (_, i) => ({
    userKey: `U-${1000 + i}`,
    trades: Math.round(80 + rnd() * 240),
    pnl: Math.round((45_000 - i * 1200 + rnd() * 2200) * 100) / 100,
  }))

  return {
    kpis: { activeUsers, inactiveUsers, retentionRate },
    charts: { newUsersDaily },
    tables: { topTraders },
  }
}

export function mockTrades(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0x85ebca6b
  const rnd = mulberry32(seed)
  const { start, end } = dateRange(filters, 30)
  const nDays = clamp(daysBetween(start, end), 7, 120)

  const totalTrades = Math.round(18_000 + rnd() * 28_000)
  const winRate = Math.round((0.48 + rnd() * 0.12) * 1000) / 1000
  const lossRate = Math.round((1 - winRate) * 1000) / 1000
  const avgTradeSize = Math.round((0.12 + rnd() * 0.55) * 1000) / 1000
  const tradeFrequencyPerUser = Math.round((4 + rnd() * 8) * 100) / 100
  const uniqueTraders = Math.round(1200 + rnd() * 1400)
  const openTrades = Math.round(120 + rnd() * 340)
  const closedTrades = Math.max(0, totalTrades - openTrades)

  const tradesOverTime = Array.from({ length: nDays }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000)
    return { date: fmtDate(d), value: Math.round(600 + rnd() * 1200) }
  })

  const buySell = [
    { name: 'BUY', value: Math.round(totalTrades * (0.52 + rnd() * 0.08)) },
    { name: 'SELL', value: Math.round(totalTrades * (0.40 + rnd() * 0.08)) },
  ]

  const topInstrumentsByTrades = [
    'EURUSD',
    'GBPUSD',
    'USDJPY',
    'XAUUSD',
    'USOIL',
    'BTCUSD',
    'NAS100',
    'SPX500',
    'AUDUSD',
    'USDCAD',
  ].map((name) => ({ name, value: Math.round(1200 + rnd() * 3800) }))

  return {
    kpis: {
      totalTrades,
      winRate,
      lossRate,
      avgTradeSize,
      tradeFrequencyPerUser,
      uniqueTraders,
      openTrades,
      closedTrades,
    },
    charts: { tradesOverTime, buySell, topInstrumentsByTrades },
  }
}

export function mockFinance(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0xc2b2ae35
  const rnd = mulberry32(seed)
  const { start, end } = dateRange(filters, 90)
  const nDays = clamp(daysBetween(start, end), 14, 180)

  const totalDeposits = Math.round((8_500_000 + rnd() * 6_500_000) * 100) / 100
  const totalWithdrawals = Math.round((6_200_000 + rnd() * 5_400_000) * 100) / 100
  const netInflowOutflow = Math.round((totalDeposits - totalWithdrawals) * 100) / 100

  const cashflowTrend = Array.from({ length: nDays }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000)
    const v = (rnd() - 0.42) * 220_000
    return { date: fmtDate(d), value: Math.round(v * 100) / 100 }
  })

  const profitPerUserTop = Array.from({ length: 20 }, (_, i) => ({
    userKey: `U-${2000 + i}`,
    pnl: Math.round((80_000 - i * 2400 + rnd() * 3000) * 100) / 100,
  }))

  return { kpis: { totalDeposits, totalWithdrawals, netInflowOutflow }, charts: { cashflowTrend, profitPerUserTop } }
}

export function mockInstruments(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0x27d4eb2f
  const rnd = mulberry32(seed)

  const list = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'USOIL', 'BTCUSD', 'NAS100', 'SPX500', 'ETHUSD', 'US30']
  const mostTraded = list.map((name) => ({ name, value: Math.round(1200 + rnd() * 5200) }))
  const volumePerInstrument = list.map((name) => ({ name, value: Math.round((100_000 + rnd() * 900_000) * 100) / 100 }))
  const profitPerInstrument = list.map((name) => ({ name, value: Math.round(((rnd() - 0.35) * 250_000) * 100) / 100 }))

  return { charts: { mostTraded, volumePerInstrument, profitPerInstrument, popularPairs: mostTraded.slice(0, 8) } }
}

export function mockRisk(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0x165667b1
  const rnd = mulberry32(seed)
  const { start, end } = dateRange(filters, 90)
  const nDays = clamp(daysBetween(start, end), 14, 180)

  const maximumDrawdown = Math.round((-180_000 - rnd() * 220_000) * 100) / 100
  const avgLeverage = Math.round((35 + rnd() * 65) * 10) / 10
  const minMarginLevel = Math.round((55 + rnd() * 45) * 10) / 10
  const avgMarginToEquity = Math.round((0.18 + rnd() * 0.26) * 1000) / 1000

  let eq = 100_000
  const equityCurve = Array.from({ length: nDays }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000)
    eq += (rnd() - 0.48) * 6500
    return { date: fmtDate(d), equity: Math.round(eq * 100) / 100 }
  })

  const marginUsers = Array.from({ length: 8 }, (_, i) => ({
    userKey: `U-${3000 + i}`,
    minMarginLevel: Math.round((45 + rnd() * 50) * 10) / 10,
  })).sort((a, b) => a.minMarginLevel - b.minMarginLevel)

  const losingUsers = Array.from({ length: 10 }, (_, i) => ({
    userKey: `U-${4000 + i}`,
    maxLosingStreak: Math.round(5 + rnd() * 9),
  })).sort((a, b) => b.maxLosingStreak - a.maxLosingStreak)

  return {
    kpis: { maximumDrawdown, avgLeverage, minMarginLevel, avgMarginToEquity },
    charts: { equityCurve },
    alerts: [
      { type: 'margin_call_risk', message: 'Users with low margin level detected', users: marginUsers },
      { type: 'losing_streak', message: 'Users with losing streaks detected', users: losingUsers },
    ],
  }
}

export function mockTime(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0x9e3779b1
  const rnd = mulberry32(seed)

  const tradesByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    value: Math.round(60 + rnd() * (hour >= 7 && hour <= 16 ? 180 : 110)),
  }))

  const tradesByDayOfWeek = [
    { dow: 1, value: Math.round(900 + rnd() * 600) },
    { dow: 2, value: Math.round(1100 + rnd() * 800) },
    { dow: 3, value: Math.round(1200 + rnd() * 900) },
    { dow: 4, value: Math.round(1250 + rnd() * 950) },
    { dow: 5, value: Math.round(1350 + rnd() * 1050) },
    { dow: 6, value: Math.round(900 + rnd() * 700) },
    { dow: 7, value: Math.round(650 + rnd() * 500) },
  ]

  const marketSessions = [
    { name: 'Asia', value: tradesByHour.slice(0, 8).reduce((a, b) => a + b.value, 0) },
    { name: 'London', value: tradesByHour.slice(8, 16).reduce((a, b) => a + b.value, 0) },
    { name: 'New York', value: tradesByHour.slice(16).reduce((a, b) => a + b.value, 0) },
  ]

  const peakHours = [...tradesByHour].sort((a, b) => b.value - a.value).slice(0, 5)
  return { charts: { tradesByHour, tradesByDayOfWeek, marketSessions, peakHours } }
}

export function mockPredictions(filters: Filters) {
  const seed = seedFromFilters(filters) ^ 0x7f4a7c15
  const rnd = mulberry32(seed)

  return {
    generatedAt: new Date().toISOString(),
    results: {
      tradeOutcome: { avgProbProfitable: Math.round((0.48 + rnd() * 0.12) * 1000) / 1000, samples: 12000 },
      userChurn: {
        top: Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, churnProb: Math.round((0.6 - i * 0.03 + rnd() * 0.03) * 1000) / 1000, trades: Math.round(2 + rnd() * 12) })),
      },
      revenueForecast: {
        horizonDays: 14,
        forecast: Array.from({ length: 14 }, (_, i) => ({
          date: new Date(Date.now() + (i + 1) * 24 * 3600 * 1000).toISOString().slice(0, 10),
          value: Math.round((85_000 + rnd() * 25_000 - i * 1200) * 100) / 100,
        })),
      },
      fraudDetection: {
        topAnomalies: Array.from({ length: 8 }, (_, i) => ({
          userKey: `U-${9000 + i}`,
          anomalyScore: Math.round((1.8 - i * 0.12 + rnd() * 0.08) * 1000) / 1000,
          trades: Math.round(250 + rnd() * 1200),
          pnl: Math.round(((rnd() - 0.2) * 180_000) * 100) / 100,
        })),
      },
      marketTrendPrediction: { status: 'demo', note: 'Mocked for frontend-only dashboard demo.' },
    },
    warnings: [],
  }
}

