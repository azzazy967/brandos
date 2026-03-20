import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Receipt } from '@/components/pos/Receipt'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'

interface PosOrderFull {
  id: string; orderNumber: string
  eventId?: string; eventName?: string
  totalAmount: number; discountAmount: number; finalAmount: number
  paymentMethod: string; notes?: string; createdAt: string
  items: Array<{
    id: string; productId: string; quantity: number; unitPrice: number; lineTotal: number
    product: { title: string; sku: string; size?: string; color?: string }
  }>
}

export default function PosOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<PosOrderFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get<PosOrderFull>(`/pos/orders/${id}`)
      .then(setOrder)
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!order) return <div className="text-center py-16 text-slate-500">Order not found</div>

  const receiptData = {
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    items: order.items.map(item => ({
      title: item.product.title,
      size: item.product.size,
      color: item.product.color,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    subtotal: order.totalAmount,
    discountAmount: order.discountAmount,
    finalAmount: order.finalAmount,
    eventName: order.eventName,
    createdAt: order.createdAt,
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pos/history')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-xl font-bold text-slate-900">{order.orderNumber}</h1>
        <Button variant="outline" onClick={() => window.print()} className="ml-auto gap-2">
          <Printer size={16} />
          Print
        </Button>
      </div>

      <Receipt receipt={receiptData} onClose={() => navigate('/pos/history')} />
    </div>
  )
}
