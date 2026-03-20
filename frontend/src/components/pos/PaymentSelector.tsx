import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaymentMethod = 'cash' | 'card' | 'instapay'

interface PaymentSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const METHODS = [
  { key: 'cash' as const, label: 'Cash', icon: Banknote },
  { key: 'card' as const, label: 'Card', icon: CreditCard },
  { key: 'instapay' as const, label: 'InstaPay', icon: Smartphone },
]

export function PaymentSelector({ value, onChange }: PaymentSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payment Method</label>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 cursor-pointer min-h-[60px]',
              value === key
                ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
