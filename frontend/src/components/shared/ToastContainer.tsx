import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore } from '@/stores/toast-store'

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={16} />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 opacity-60 hover:opacity-100 transition-opacity duration-150 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
