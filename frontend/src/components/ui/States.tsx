export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 text-sm text-slate-300">
      {label}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-6 text-sm text-rose-200">
      {message}
    </div>
  )
}

