import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

