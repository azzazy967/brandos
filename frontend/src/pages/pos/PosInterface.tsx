import { useState, useEffect } from 'react'
import { ShoppingCart, X } from 'lucide-react'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { Cart } from '@/components/pos/Cart'
import { Receipt } from '@/components/pos/Receipt'
import { Modal } from '@/components/ui/modal'
import { useCartStore } from '@/stores/cart-store'
import { formatCurrency } from '@/lib/utils'
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
  const [cartOpen, setCartOpen] = useState(false)
  const { items, paymentMethod, total, subtotal, discountAmount, clearCart } = useCartStore()

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const cartTotal = total()

  useEffect(() => {
    Promise.all([
      api.get<PosProduct[]>('/pos/products'),
      api.get<ActiveEvent[]>('/pos/events?status=active'),
    ]).then(([prods, events]) => {
      setProducts(prods ?? [])
      setActiveEvent((events ?? [])[0] ?? null)
    }).catch(() => toast.error('Failed to load POS data'))
    .finally(() => setLoading(false))
  }, [])

  const refreshProducts = async () => {
    try {
      const data = await api.get<PosProduct[]>('/pos/products')
      setProducts(data ?? [])
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
      {/* Product grid - full width on mobile, flex-1 on desktop */}
      <div className="flex-1 overflow-hidden">
        <ProductGrid products={products} loading={loading} />
      </div>

      {/* Cart - desktop sidebar (lg+) */}
      <div className="hidden lg:block w-80 xl:w-96 shrink-0 overflow-hidden">
        <Cart
          onCharge={handleCharge}
          charging={charging}
          eventName={activeEvent?.name}
        />
      </div>

      {/* Mobile floating cart button (below lg) */}
      <button
        onClick={() => setCartOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#F97316] text-white font-bold text-sm shadow-lg hover:bg-[#EA580C] active:scale-95 transition-all duration-150 min-h-[44px] cursor-pointer"
      >
        <ShoppingCart size={20} />
        <span>Cart{itemCount > 0 ? ` (${itemCount})` : ''}</span>
        {itemCount > 0 && (
          <span className="font-mono">{formatCurrency(cartTotal)}</span>
        )}
      </button>

      {/* Mobile cart bottom sheet (below lg) */}
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${cartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setCartOpen(false)}
      />
      {/* Sheet */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl h-[80vh] transition-transform duration-300 ease-out shadow-2xl flex flex-col ${cartOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Drag handle + close */}
        <div className="shrink-0 pt-3 pb-2 px-4 border-b border-slate-200 dark:border-slate-700">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Cart</h2>
            <button
              onClick={() => setCartOpen(false)}
              className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {/* Cart content fills remaining height; Cart's internal flex layout handles scrolling */}
        <div className="flex-1 overflow-hidden">
          <Cart
            onCharge={() => { handleCharge(); setCartOpen(false) }}
            charging={charging}
            eventName={activeEvent?.name}
          />
        </div>
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
