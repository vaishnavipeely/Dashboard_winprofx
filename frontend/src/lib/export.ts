import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export function downloadCsv(filename: string, rows: any[]) {
  const csv = Papa.unparse(rows ?? [])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadXlsx(filename: string, rows: any[], sheetName = 'data') {
  const ws = XLSX.utils.json_to_sheet(rows ?? [])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

