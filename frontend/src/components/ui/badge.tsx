import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'default': 'bg-[#2563EB] text-white',
          'success': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
          'warning': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
          'danger': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
          'info': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
          'muted': 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
        }[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
