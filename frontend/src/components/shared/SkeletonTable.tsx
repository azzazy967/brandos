interface SkeletonTableProps {
  rows?: number
  cols?: number
}

/* Pseudo-random width for visual variety (deterministic per row+col) */
const CELL_WIDTHS = ['w-3/4', 'w-full', 'w-2/3', 'w-5/6', 'w-1/2', 'w-4/5', 'w-3/5']

export function SkeletonTable({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header row */}
      <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1">
            <div className="skeleton-shimmer h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
      {/* Body rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex-1">
                <div
                  className={`skeleton-shimmer h-4 rounded ${CELL_WIDTHS[(r + c) % CELL_WIDTHS.length]}`}
                  style={{ animationDelay: `${(r * cols + c) * 50}ms` }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
