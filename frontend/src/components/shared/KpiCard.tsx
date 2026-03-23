import React, { useState, useEffect, useRef } from 'react'
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
  sparkline?: number[]
  onClick?: () => void
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
  neutral: 'border-l-4 border-l-slate-200 dark:border-l-slate-600',
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Animates a numeric value from 0 to `target` over ~600ms on mount.
 * Returns the formatted string with the animated number swapped in.
 */
function useCountUp(formatted: string, target: number | string, format: Format): string {
  const [display, setDisplay] = useState(formatted)
  const prevTarget = useRef<number | string>(target)

  useEffect(() => {
    // Always update display when formatted value changes (handles string targets)
    setDisplay(formatted)
  }, [formatted])

  useEffect(() => {
    const numericTarget = typeof target === 'number' ? target : null
    const prevNumeric = typeof prevTarget.current === 'number' ? prevTarget.current : null
    prevTarget.current = target

    // Skip animation for non-numbers, zero, or unchanged values
    if (numericTarget === null || numericTarget === 0) return
    if (prevNumeric === numericTarget) return

    const duration = 600
    let start: number | null = null
    let rafId: number

    const tick = (timestamp: number) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const current = easedProgress * numericTarget

      setDisplay(formatValue(current, format))

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setDisplay(formatted)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [target, formatted, format])

  return display
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null

  const width = 200
  const height = 30
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((val - min) / range) * height
    return `${x},${y}`
  })

  const polylinePoints = points.join(' ')

  // Build a closed polygon for the gradient fill area:
  // start at bottom-left, trace the line, end at bottom-right
  const fillPoints = `0,${height} ${polylinePoints} ${width},${height}`

  const gradientId = React.useId()

  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden rounded-b-xl">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        style={{ height: '30px' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={fillPoints}
          fill={`url(#${gradientId})`}
        />
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#3B82F6"
          strokeOpacity="0.4"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
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
  sparkline,
  onClick,
}: KpiCardProps) {
  const formattedValue = formatValue(value, format)
  const animatedValue = useCountUp(formattedValue, value, format)

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
  const isClickable = typeof onClick === 'function'

  const Wrapper = isClickable ? 'button' : 'div'
  const wrapperProps = isClickable
    ? { type: 'button' as const, onClick }
    : {}

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5 hover:shadow-lg hover:-translate-y-0.5',
        statusBorderMap[status],
        isClickable && 'cursor-pointer transition-shadow hover:ring-2 hover:ring-blue-500/20',
        className,
      )}
    >
      <Wrapper {...wrapperProps} className={isClickable ? 'w-full text-left' : undefined}>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
            {Icon && (
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700">
                <Icon size={18} className="text-slate-400 dark:text-slate-300" />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-end gap-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {animatedValue}
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
        </div>

        {sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} />
        )}
      </Wrapper>
    </Card>
  )
}
