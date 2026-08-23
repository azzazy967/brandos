import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface ReceiptItem {
  title: string; size?: string; color?: string
  quantity: number; unitPrice: number; lineTotal: number
}

interface ReceiptData {
  orderNumber: string; paymentMethod: string
  items: ReceiptItem[]; subtotal: number
  discountAmount: number; finalAmount: number
  eventName?: string; createdAt: string
}

interface ReceiptProps {
  receipt: ReceiptData
  onClose: () => void
}

export function Receipt({ receipt, onClose }: ReceiptProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-6 h-6 text-green-600 dark:text-green-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment Successful!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Order {receipt.orderNumber}</p>
      </div>

      {/* Receipt content */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-4 print-receipt">
        <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-600 pb-4">
          <p className="font-bold text-lg font-mono">Brand OS</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(receipt.createdAt)}</p>
          {receipt.eventName && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Event: {receipt.eventName}</p>}
        </div>

        <div className="space-y-2">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <div>
                <p className="font-medium">{item.title}</p>
                {(item.size || item.color) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{[item.size, item.color].filter(Boolean).join(' · ')} × {item.quantity}</p>
                )}
              </div>
              <p className="font-mono font-semibold shrink-0 ml-4">{formatCurrency(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span><span className="font-mono">{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400">
              <span>Discount</span><span className="font-mono">-{formatCurrency(receipt.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1.5">
            <span>TOTAL</span>
            <span className="font-mono">{formatCurrency(receipt.finalAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>Payment</span>
            <span className="capitalize">{receipt.paymentMethod}</span>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 border-t border-dashed border-slate-300 dark:border-slate-600 pt-3">
          <p>Thank you for your purchase!</p>
          <p className="font-mono mt-1">{receipt.orderNumber}</p>
        </div>
      </div>

      <div className="flex gap-3 no-print">
        <Button variant="outline" onClick={handlePrint} className="flex-1 gap-2">
          <Printer size={16} />
          Print Receipt
        </Button>
        <Button onClick={onClose} className="flex-1">New Sale</Button>
      </div>
    </div>
  )
}
