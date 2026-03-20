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
          'success': 'bg-green-100 text-green-700',
          'warning': 'bg-amber-100 text-amber-700',
          'danger': 'bg-red-100 text-red-700',
          'info': 'bg-blue-100 text-blue-700',
          'muted': 'bg-slate-100 text-slate-600',
        }[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
