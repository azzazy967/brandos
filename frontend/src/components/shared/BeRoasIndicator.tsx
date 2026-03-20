import { cn } from '@/lib/utils'
import { getBeroasStatus } from '@/lib/beroas'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface BeRoasIndicatorProps {
  actualRoas: number
  beRoas: number
  showDetails?: boolean
  className?: string
}

export function BeRoasIndicator({ actualRoas, beRoas, showDetails = true, className }: BeRoasIndicatorProps) {
  const status = getBeroasStatus(actualRoas, beRoas)
  const gap = actualRoas - beRoas


  const config = {
    above: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Above BEROAS', Icon: TrendingUp },
    near: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Near BEROAS', Icon: Minus },
    below: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Below BEROAS', Icon: TrendingDown },
  }[status]

  const StatusIcon = config.Icon

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 border text-sm font-medium', config.bg, config.border, config.color, className)}>
      <StatusIcon size={14} />
      <span>{actualRoas.toFixed(2)}x</span>
      {showDetails && (
        <span className="text-xs opacity-75">
          / {beRoas.toFixed(2)}x BE ({gap >= 0 ? '+' : ''}{gap.toFixed(2)})
        </span>
      )}
    </div>
  )
}

interface BeroasBarProps {
  actualRoas: number
  beRoas: number
}

export function BeroasBar({ actualRoas, beRoas }: BeroasBarProps) {
  const maxRoas = Math.max(actualRoas, beRoas) * 1.2
  const actualPct = Math.min((actualRoas / maxRoas) * 100, 100)
  const bePct = Math.min((beRoas / maxRoas) * 100, 100)
  const status = getBeroasStatus(actualRoas, beRoas)
  const barColor = { above: 'bg-green-500', near: 'bg-amber-500', below: 'bg-red-500' }[status]

  return (
    <div className="relative h-6 bg-slate-100 rounded-full overflow-visible">
      {/* Actual ROAS bar */}
      <div
        className={cn('absolute left-0 top-0 h-full rounded-full transition-all duration-500', barColor)}
        style={{ width: `${actualPct}%` }}
      />
      {/* BEROAS reference line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10"
        style={{ left: `${bePct}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-end pr-2">
        <span className="text-xs font-mono font-semibold text-white drop-shadow">
          {actualRoas.toFixed(1)}x
        </span>
      </div>
    </div>
  )
}
