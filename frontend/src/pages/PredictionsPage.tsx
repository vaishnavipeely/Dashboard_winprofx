import { useMemo, useState } from 'react'
import { Card } from '../components/ui/Card'
import { FiltersBar, type Filters } from '../components/ui/FiltersBar'
import { mockPredictions } from '../data/mock'

export function PredictionsPage() {
  const [filters, setFilters] = useState<Filters>({})
  const [trainedAt, setTrainedAt] = useState<string | null>(null)
  const data = useMemo(() => mockPredictions(filters), [filters, trainedAt])

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Predictions & Insights</div>
          <div className="text-xs text-slate-400">Frontend-only demo (mocked models)</div>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900/70"
            onClick={async () => {
              setTrainedAt(new Date().toISOString())
            }}
          >
            Train / Refresh Models
          </button>
          <button
            className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950"
            onClick={() => setTrainedAt(new Date().toISOString())}
          >
            Reload
          </button>
        </div>
      </Card>

      <FiltersBar value={filters} onChange={setFilters} />

      {trainedAt ? <div className="text-xs text-slate-400">Last refreshed: {trainedAt}</div> : null}

      {data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <div className="text-sm font-semibold text-white">Trade outcome prediction</div>
            <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(data.results?.tradeOutcome ?? null, null, 2)}
            </pre>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-white">User churn prediction</div>
            <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(data.results?.userChurn ?? null, null, 2)}
            </pre>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-white">Revenue forecast</div>
            <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(data.results?.revenueForecast ?? null, null, 2)}
            </pre>
          </Card>
          <Card>
            <div className="text-sm font-semibold text-white">Fraud detection</div>
            <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(data.results?.fraudDetection ?? null, null, 2)}
            </pre>
          </Card>
          <Card className="lg:col-span-2">
            <div className="text-sm font-semibold text-white">Market trend prediction</div>
            <pre className="mt-2 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-200">
              {JSON.stringify(data.results?.marketTrendPrediction ?? null, null, 2)}
            </pre>
          </Card>
          {Array.isArray(data.warnings) && data.warnings.length > 0 ? (
            <Card className="lg:col-span-2">
              <div className="text-sm font-semibold text-white">Warnings</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
                {data.warnings.map((w: string, idx: number) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

