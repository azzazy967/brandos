import { useState } from 'react'
import { Minus, Plus, X, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { PaymentSelector } from './PaymentSelector'
import { cn, formatCurrency } from '@/lib/utils'

interface CartProps {
  onCharge: () => void
  charging: boolean
  eventName?: string
}

export function Cart({ onCharge, charging, eventName }: CartProps) {
  const {
    items, removeItem, updateQuantity,
    discount, discountType, setDiscount,
    paymentMethod, setPaymentMethod,
    subtotal, discountAmount, total,
  } = useCartStore()

  const [discountInput, setDiscountInput] = useState(String(discount))
  const [discountTypeLocal, setDiscountTypeLocal] = useState(discountType)

  const handleDiscountChange = (value: string, type: 'fixed' | 'percent') => {
    setDiscountInput(value)
    setDiscountTypeLocal(type)
    setDiscount(Number(value) || 0, type)
  }

  const sub = subtotal()
  const disc = discountAmount()
  const tot = total()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-[#2563EB]" />
          <h2 className="font-bold text-slate-900 dark:text-slate-100">Cart</h2>
          {items.length > 0 && (
            <span className="ml-auto h-5 w-5 rounded-full bg-[#F97316] text-white text-xs font-bold flex items-center justify-center">
              {items.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </div>
        {eventName && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Event: {eventName}</p>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs mt-1">Tap products to add them</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.productId} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-slate-200 dark:bg-slate-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{item.title}</p>
                {(item.size || item.color) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                )}
                <p className="text-sm font-bold text-[#2563EB] font-mono mt-0.5">{formatCurrency(item.price * item.quantity)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-mono text-sm font-bold">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxStock}
                  className="h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:border-[#2563EB] hover:text-[#2563EB] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals + checkout */}
      {items.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4 shrink-0">
          {/* Discount */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Discount</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden flex-1">
                <button
                  onClick={() => handleDiscountChange(discountInput, 'fixed')}
                  className={cn('flex-1 text-xs font-medium py-2 transition-colors cursor-pointer', discountTypeLocal === 'fixed' ? 'bg-[#2563EB] text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700')}
                >
                  EGP
                </button>
                <button
                  onClick={() => handleDiscountChange(discountInput, 'percent')}
                  className={cn('flex-1 text-xs font-medium py-2 transition-colors cursor-pointer', discountTypeLocal === 'percent' ? 'bg-[#2563EB] text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700')}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                value={discountInput}
                onChange={e => handleDiscountChange(e.target.value, discountTypeLocal)}
                placeholder="0"
                className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#2563EB] transition-colors"
                min="0"
                max={discountTypeLocal === 'percent' ? '100' : undefined}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(sub)}</span>
            </div>
            {disc > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="font-mono">-{formatCurrency(disc)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-700">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(tot)}</span>
            </div>
          </div>

          {/* Payment method */}
          <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />

          {/* Charge button */}
          <button
            onClick={onCharge}
            disabled={charging || items.length === 0}
            className={cn(
              'w-full h-14 rounded-xl font-bold text-lg text-white transition-all duration-200 cursor-pointer',
              'bg-green-600 hover:bg-green-700 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-md hover:shadow-lg'
            )}
          >
            {charging ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              `Charge ${formatCurrency(tot)}`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
