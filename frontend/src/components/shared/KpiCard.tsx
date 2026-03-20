import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { Card } from '@/components/ui/card'

type Format = 'currency' | 'number' | 'percent' | 'roas' | 'raw'
type Status = 'healthy' | 'warning' | 'critical' | 'neutral'

interface KpiCardProps {
  title: string
  value: number | string
  format?: Format
  delta?: number
  deltaLabel?: string
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>
  status?: Status
  loading?: boolean
  className?: string
  subtitle?: string
}

function formatValue(value: number | string, format: Format): string {
  if (typeof value === 'string') return value
  switch (format) {
    case 'currency': return formatCurrency(value)
    case 'number': return formatNumber(value)
    case 'percent': return formatPercent(value)
    case 'roas': return `${value.toFixed(2)}x`
    default: return String(value)
  }
}

const statusBorderMap: Record<Status, string> = {
  healthy: 'border-l-4 border-l-green-500',
  warning: 'border-l-4 border-l-amber-500',
  critical: 'border-l-4 border-l-red-500',
  neutral: 'border-l-4 border-l-slate-200',
}

export function KpiCard({
  title,
  value,
  format = 'raw',
  delta,
  deltaLabel,
  icon: Icon,
  status = 'neutral',
  loading = false,
  className,
  subtitle,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn('p-5', statusBorderMap[status], className)}>
        <div className="skeleton h-4 w-24 mb-3 rounded" />
        <div className="skeleton h-8 w-32 mb-2 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </Card>
    )
  }

  const isPositiveDelta = (delta ?? 0) > 0
  const isNegativeDelta = (delta ?? 0) < 0

  return (
    <Card className={cn('p-5 hover:shadow-lg hover:-translate-y-0.5', statusBorderMap[status], className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-50">
            <Icon size={18} className="text-slate-400" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-end gap-3">
        <span className="text-2xl font-bold text-slate-900 font-mono">
          {formatValue(value, format)}
        </span>
        {delta !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium mb-0.5',
            isPositiveDelta && 'text-green-600',
            isNegativeDelta && 'text-red-600',
            !isPositiveDelta && !isNegativeDelta && 'text-slate-500'
          )}>
            {isPositiveDelta ? <TrendingUp size={14} /> : isNegativeDelta ? <TrendingDown size={14} /> : <Minus size={14} />}
            <span>{isPositiveDelta ? '+' : ''}{delta.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {(deltaLabel || subtitle) && (
        <p className="mt-1 text-xs text-slate-400">{deltaLabel ?? subtitle}</p>
      )}
    </Card>
  )
}
