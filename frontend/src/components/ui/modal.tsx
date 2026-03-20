import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, className, maxWidth = 'max-w-lg' }: ModalProps) {
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className={cn(
          'relative bg-white rounded-2xl p-8 shadow-xl w-full',
          maxWidth,
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors duration-150 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors duration-150 cursor-pointer"
          >
            <X size={20} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
