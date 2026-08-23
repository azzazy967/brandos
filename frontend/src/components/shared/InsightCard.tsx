import { X, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface AiInsight {
  id: string
  module: string
  severity: 'info' | 'warning' | 'critical'
  titleEn: string
  bodyEn: string
  isRead: boolean
  createdAt: string
}

interface InsightCardProps {
  insight: AiInsight
  onDismiss?: (id: string) => void
  onMarkRead?: (id: string) => void
  compact?: boolean
}

const severityConfig = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    bgRead: 'bg-slate-50 dark:bg-slate-800/40',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    iconColorRead: 'text-red-400/60 dark:text-red-500/40',
    badge: 'danger' as const,
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    bgRead: 'bg-slate-50 dark:bg-slate-800/40',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconColorRead: 'text-amber-400/60 dark:text-amber-500/40',
    badge: 'warning' as const,
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    bgRead: 'bg-slate-50 dark:bg-slate-800/40',
    icon: Info,
    iconColor: 'text-blue-500',
    iconColorRead: 'text-blue-400/60 dark:text-blue-500/40',
    badge: 'info' as const,
  },
}

export function InsightCard({ insight, onDismiss, onMarkRead, compact = false }: InsightCardProps) {
  const config = severityConfig[insight.severity]
  const SeverityIcon = config.icon

  return (
    <div className={cn(
      'relative rounded-xl border-l-4 p-4 transition-all duration-200',
      config.border,
      insight.isRead
        ? cn(config.bgRead, 'border-l-slate-300 dark:border-l-slate-600')
        : cn(config.bg, 'ring-1 ring-slate-200 dark:ring-slate-600')
    )}>
      <div className="flex items-start gap-3">
        <SeverityIcon size={18} className={cn('mt-0.5 shrink-0', insight.isRead ? config.iconColorRead : config.iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{insight.titleEn}</p>
            <Badge variant={config.badge} className="text-xs">{insight.severity}</Badge>
            <Badge variant="muted" className="text-xs capitalize">{insight.module}</Badge>
          </div>
          {!compact && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{insight.bodyEn}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onMarkRead && !insight.isRead && (
            <button
              onClick={() => onMarkRead(insight.id)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-150 cursor-pointer px-2 py-0.5 rounded"
            >
              Mark read
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(insight.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-150 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
