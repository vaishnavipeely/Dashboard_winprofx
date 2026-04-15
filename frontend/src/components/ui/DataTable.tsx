import { Card } from './Card'

export type Column<T> = { key: keyof T; label: string; render?: (row: T) => React.ReactNode }

export function DataTable<T extends Record<string, any>>({
  title,
  columns,
  rows,
}: {
  title: string
  columns: Column<T>[]
  rows: T[]
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-400">{rows.length} rows</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)} className="whitespace-nowrap px-4 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((r, idx) => (
              <tr key={idx} className="text-slate-200">
                {columns.map((c) => (
                  <td key={String(c.key)} className="whitespace-nowrap px-4 py-2">
                    {c.render ? c.render(r) : String(r[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-400" colSpan={columns.length}>
                  No data
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

