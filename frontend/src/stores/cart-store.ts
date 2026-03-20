import { create } from 'zustand'

export interface CartItem {
  productId: string
  title: string
  size?: string
  color?: string
  price: number
  quantity: number
  maxStock: number
  imageUrl?: string
}

type PaymentMethod = 'cash' | 'card' | 'instapay'
type DiscountType = 'fixed' | 'percent'

interface CartState {
  items: CartItem[]
  discount: number
  discountType: DiscountType
  paymentMethod: PaymentMethod
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  setDiscount: (value: number, type: DiscountType) => void
  setPaymentMethod: (method: PaymentMethod) => void
  clearCart: () => void
  subtotal: () => number
  discountAmount: () => number
  total: () => number
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  discount: 0,
  discountType: 'fixed',
  paymentMethod: 'cash',

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(i => i.productId === item.productId)
      if (existing) {
        if (existing.quantity >= item.maxStock) return state
        return {
          items: state.items.map(i =>
            i.productId === item.productId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return { items: [...state.items, { ...item, quantity: 1 }] }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter(i => i.productId !== productId),
    }))
  },

  updateQuantity: (productId, quantity) => {
    if (quantity < 1) {
      get().removeItem(productId)
      return
    }
    set((state) => ({
      items: state.items.map(i => {
        if (i.productId !== productId) return i
        const clamped = Math.min(quantity, i.maxStock)
        return { ...i, quantity: clamped }
      }),
    }))
  },

  setDiscount: (value, type) => set({ discount: value, discountType: type }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  clearCart: () => set({
    items: [],
    discount: 0,
    discountType: 'fixed',
    paymentMethod: 'cash',
  }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  discountAmount: () => {
    const sub = get().subtotal()
    const { discount, discountType } = get()
    if (discountType === 'percent') return (sub * discount) / 100
    return Math.min(discount, sub)
  },

  total: () => get().subtotal() - get().discountAmount(),
}))
