interface SkeletonTableProps {
  rows?: number
  cols?: number
}

export function SkeletonTable({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-4 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="skeleton h-4 rounded flex-1"
                style={{ opacity: 1 - c * 0.1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
