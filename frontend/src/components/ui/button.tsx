import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'link' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
          {
            'default': 'bg-[#F97316] text-white hover:opacity-90 hover:-translate-y-px focus-visible:ring-[#F97316] shadow-md',
            'secondary': 'bg-transparent text-[#2563EB] border-2 border-[#2563EB] hover:bg-[#2563EB] hover:text-white focus-visible:ring-[#2563EB]',
            'destructive': 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 shadow-md',
            'ghost': 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
            'link': 'text-[#2563EB] underline-offset-4 hover:underline focus-visible:ring-[#2563EB]',
            'outline': 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 shadow-sm',
          }[variant],
          {
            'default': 'h-10 px-6 py-2 text-sm rounded-lg',
            'sm': 'h-8 px-4 py-1 text-xs rounded-md',
            'lg': 'h-12 px-8 py-3 text-base rounded-lg',
            'icon': 'h-10 w-10 rounded-lg',
          }[size],
          className
        )}
        ref={ref}
        disabled={disabled ?? loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button }
