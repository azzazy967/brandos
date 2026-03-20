import { Plus, Package } from 'lucide-react'
import { cn } from '@/lib/utils'


interface PosProduct {
  id: string; title: string; sku: string; imageUrl?: string
  size?: string; color?: string; sellingPrice: number; stockPhysical: number
}

interface ProductCardProps {
  product: PosProduct
  onAdd: () => void
  cartQty: number
}

export function ProductCard({ product, onAdd, cartQty }: ProductCardProps) {
  const isOutOfStock = product.stockPhysical <= 0
  const isMaxed = cartQty >= product.stockPhysical

  return (
    <button
      onClick={onAdd}
      disabled={isOutOfStock || isMaxed}
      className={cn(
        'relative flex flex-col w-full rounded-xl border-2 bg-white overflow-hidden text-left',
        'transition-all duration-200 cursor-pointer',
        'min-h-[160px]',
        isOutOfStock || isMaxed
          ? 'border-slate-200 opacity-50 cursor-not-allowed'
          : 'border-transparent hover:border-[#2563EB] hover:shadow-lg active:scale-95',
        cartQty > 0 && !isOutOfStock && 'border-blue-300 shadow-md'
      )}
    >
      {/* Image */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-slate-300" />
          </div>
        )}

        {/* Out of stock overlay */}
        {(isOutOfStock || isMaxed) && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wide">
              {isOutOfStock ? 'Out of Stock' : 'Max qty'}
            </span>
          </div>
        )}

        {/* Cart qty badge */}
        {cartQty > 0 && !isOutOfStock && (
          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center">
            {cartQty}
          </div>
        )}

        {/* Add icon */}
        {!isOutOfStock && !isMaxed && (
          <div className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus size={16} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{product.title}</p>
        <div className="flex flex-wrap gap-1 mt-auto">
          {product.size && (
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{product.size}</span>
          )}
          {product.color && (
            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{product.color}</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-[#2563EB] font-mono">EGP {product.sellingPrice}</span>
          <span className={cn(
            'text-xs font-medium',
            product.stockPhysical <= 5 ? 'text-red-500' : product.stockPhysical <= 10 ? 'text-amber-500' : 'text-slate-400'
          )}>
            {product.stockPhysical} left
          </span>
        </div>
      </div>
    </button>
  )
}
