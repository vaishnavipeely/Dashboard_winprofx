import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { OverviewPage } from './pages/OverviewPage'
import { UsersPage } from './pages/UsersPage'
import { TradesPage } from './pages/TradesPage'
import { FinancePage } from './pages/FinancePage'
import { RiskPage } from './pages/RiskPage'
import { TimeAnalyticsPage } from './pages/TimeAnalyticsPage'
import { InstrumentsPage } from './pages/InstrumentsPage'
import { PredictionsPage } from './pages/PredictionsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="trades" element={<TradesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="instruments" element={<InstrumentsPage />} />
        <Route path="risk" element={<RiskPage />} />
        <Route path="time" element={<TimeAnalyticsPage />} />
        <Route path="predictions" element={<PredictionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
