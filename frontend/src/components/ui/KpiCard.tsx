import type { ReactNode } from 'react'
import { Card } from './Card'

export function KpiCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string
  value: ReactNode
  subValue?: ReactNode
  icon?: ReactNode
}) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="mt-1 truncate text-2xl font-semibold text-white">{value}</div>
        {subValue ? <div className="mt-1 text-xs text-slate-400">{subValue}</div> : null}
      </div>
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/60 text-slate-200">
          {icon}
        </div>
      ) : null}
    </Card>
  )
}

