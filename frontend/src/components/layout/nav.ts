import {
  Activity,
  BarChart3,
  Clock,
  Gauge,
  Landmark,
  LineChart,
  ShieldAlert,
  Users,
} from 'lucide-react'

export const navItems = [
  { to: '/', label: 'Overview', icon: Gauge },
  { to: '/users', label: 'User Analytics', icon: Users },
  { to: '/trades', label: 'Trading Analytics', icon: Activity },
  { to: '/finance', label: 'Financial Analytics', icon: Landmark },
  { to: '/instruments', label: 'Instrument Analysis', icon: BarChart3 },
  { to: '/risk', label: 'Risk Analysis', icon: ShieldAlert },
  { to: '/time', label: 'Time-Based Analytics', icon: Clock },
  { to: '/predictions', label: 'Predictions & Insights', icon: LineChart },
]

