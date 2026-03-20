import { LucideIcon, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: LucideIcon
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-slate-100 mb-4">
        <Icon size={32} className="text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  )
}
