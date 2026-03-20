import { useState, useEffect } from 'react'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { Cart } from '@/components/pos/Cart'
import { Receipt } from '@/components/pos/Receipt'
import { Modal } from '@/components/ui/modal'
import { useCartStore } from '@/stores/cart-store'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'

interface PosProduct {
  id: string; title: string; sku: string; imageUrl?: string
  size?: string; color?: string; sellingPrice: number; stockPhysical: number
  collection?: string; category?: string
}

interface ActiveEvent {
  id: string; name: string
}

interface ReceiptData {
  orderNumber: string; paymentMethod: string
  items: Array<{ title: string; size?: string; color?: string; quantity: number; unitPrice: number; lineTotal: number }>
  subtotal: number; discountAmount: number; finalAmount: number
  eventName?: string; createdAt: string
}

export default function PosInterface() {
  const [products, setProducts] = useState<PosProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [charging, setCharging] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)
  const { items, paymentMethod, total, subtotal, discountAmount, clearCart } = useCartStore()

  useEffect(() => {
    Promise.all([
      api.get<{ data: PosProduct[] }>('/pos/products'),
      api.get<{ data: ActiveEvent[] }>('/pos/events?status=active'),
    ]).then(([prods, events]) => {
      setProducts(prods.data ?? [])
      setActiveEvent((events.data ?? [])[0] ?? null)
    }).catch(() => toast.error('Failed to load POS data'))
    .finally(() => setLoading(false))
  }, [])

  const refreshProducts = async () => {
    try {
      const data = await api.get<{ data: PosProduct[] }>('/pos/products')
      setProducts(data.data ?? [])
    } catch { /* silent */ }
  }

  const handleCharge = async () => {
    if (items.length === 0) { toast.error('Cart is empty'); return }

    const totalAmount = total()
    if (totalAmount < 0) { toast.error('Invalid total'); return }

    setCharging(true)
    try {
      const payload = {
        items: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
        totalAmount: subtotal(),
        discountAmount: discountAmount(),
        finalAmount: totalAmount,
        paymentMethod,
        eventId: activeEvent?.id,
      }

      const order = await api.post<{
        id: string; orderNumber: string; items: typeof payload.items
        finalAmount: number; discountAmount: number; createdAt: string
      }>('/pos/orders', payload)

      const receiptData: ReceiptData = {
        orderNumber: order.orderNumber,
        paymentMethod,
        items: items.map(i => ({
          title: i.title,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          unitPrice: i.price,
          lineTotal: i.price * i.quantity,
        })),
        subtotal: subtotal(),
        discountAmount: discountAmount(),
        finalAmount: order.finalAmount,
        eventName: activeEvent?.name,
        createdAt: order.createdAt,
      }

      clearCart()
      setReceipt(receiptData)
      refreshProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Charge failed')
    } finally {
      setCharging(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden">
      {/* Product grid - main area */}
      <div className="flex-1 overflow-hidden">
        <ProductGrid products={products} loading={loading} />
      </div>

      {/* Cart - right sidebar */}
      <div className="w-80 xl:w-96 shrink-0 overflow-hidden">
        <Cart
          onCharge={handleCharge}
          charging={charging}
          eventName={activeEvent?.name}
        />
      </div>

      {/* Receipt modal */}
      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        maxWidth="max-w-md"
      >
        {receipt && (
          <Receipt receipt={receipt} onClose={() => setReceipt(null)} />
        )}
      </Modal>
    </div>
  )
}
