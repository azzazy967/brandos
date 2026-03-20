import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { useCartStore } from '@/stores/cart-store'

interface PosProduct {
  id: string; title: string; sku: string; imageUrl?: string
  size?: string; color?: string; sellingPrice: number; stockPhysical: number
  collection?: string; category?: string
}

interface ProductGridProps {
  products: PosProduct[]
  loading: boolean
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const [search, setSearch] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('')
  const { items, addItem } = useCartStore()

  const collections = useMemo(() =>
    [...new Set(products.map(p => p.collection).filter(Boolean))],
    [products]
  )

  const filtered = useMemo(() => {
    let result = products
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      )
    }
    if (collectionFilter) {
      result = result.filter(p => p.collection === collectionFilter)
    }
    return result
  }, [products, search, collectionFilter])

  const getCartQty = (productId: string) =>
    items.find(i => i.productId === productId)?.quantity ?? 0

  const handleAddToCart = (product: PosProduct) => {
    addItem({
      productId: product.id,
      title: product.title,
      size: product.size,
      color: product.color,
      price: product.sellingPrice,
      maxStock: product.stockPhysical,
      imageUrl: product.imageUrl,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200">
          <div className="skeleton h-10 rounded-lg" />
        </div>
        <div className="flex-1 p-4 grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + filters */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products or SKU..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-4 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
          />
        </div>

        {collections.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCollectionFilter('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${!collectionFilter ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {collections.map(col => (
              <button
                key={col}
                onClick={() => setCollectionFilter(col === collectionFilter ? '' : col!)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${collectionFilter === col ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {col}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-1">Try a different search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => handleAddToCart(product)}
                cartQty={getCartQty(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
