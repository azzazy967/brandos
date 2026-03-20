import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BeRoasIndicator } from '@/components/shared/BeRoasIndicator'
import { KpiCard } from '@/components/shared/KpiCard'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateProductBEROAS } from '@/lib/beroas'

interface ProductDetail {
  id: string; title: string; sku: string; collection?: string
  size?: string; color?: string; imageUrl?: string
  sellingPrice: number; costPrice: number
  stockWarehouse: number; stockShopify: number; stockPhysical: number
  unitsSold30d: number; avgDailySales: number
  projectedStockoutDate?: string; status: string
  stockHistory: Array<{ date: string; stock: number }>
  salesHistory: Array<{ date: string; units: number; revenue: number }>
  currentRoas?: number
  overheadPerUnit?: number; avgShippingCost?: number
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get<ProductDetail>(`/inventory/${id}`)
      .then(setProduct)
      .catch(() => toast.error('Failed to load product'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="space-y-4"><div className="skeleton h-8 w-64 rounded" /><div className="skeleton h-64 rounded-xl" /></div>
  }

  if (!product) {
    return <div className="text-center py-16"><p className="text-slate-500">Product not found</p></div>
  }

  const beroas = calculateProductBEROAS({
    sellingPrice: product.sellingPrice,
    cogs: product.costPrice,
    avgShippingCost: product.avgShippingCost ?? 50,
    overheadPerUnit: product.overheadPerUnit ?? 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Package size={24} className="text-slate-400" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900">{product.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-slate-500">{product.sku}</span>
              {product.collection && <span className="text-xs text-slate-400">{product.collection}</span>}
              {product.size && <span className="text-xs text-slate-400">{product.size}</span>}
              {product.color && <span className="text-xs text-slate-400">{product.color}</span>}
            </div>
          </div>
        </div>
        <StatusBadge status={product.status} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Selling Price" value={product.sellingPrice} format="currency" />
        <KpiCard title="Cost Price" value={product.costPrice} format="currency" />
        <KpiCard title="Total Stock" value={product.stockWarehouse + product.stockShopify + product.stockPhysical} format="number" />
        <KpiCard title="Sold (30d)" value={product.unitsSold30d} format="number" />
      </div>

      {/* Stock breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Warehouse</p>
          <p className="text-2xl font-bold text-slate-900">{product.stockWarehouse}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Shopify</p>
          <p className="text-2xl font-bold text-blue-600">{product.stockShopify}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500">Physical (POS)</p>
          <p className="text-2xl font-bold text-[#F97316]">{product.stockPhysical}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock history chart */}
        <Card>
          <CardHeader><CardTitle>Stock Level Over Time</CardTitle></CardHeader>
          <CardContent>
            {product.stockHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={product.stockHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="stock" stroke="#2563EB" strokeWidth={2} dot={false} name="Stock" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-500 py-8 text-center">No stock history available</p>}
          </CardContent>
        </Card>

        {/* BEROAS card */}
        <Card>
          <CardHeader><CardTitle>BEROAS Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Gross Profit/unit</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(beroas.grossProfit)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Margin %</p>
                <p className={`text-lg font-bold ${beroas.marginPct >= 0.3 ? 'text-green-600' : beroas.marginPct >= 0.2 ? 'text-amber-600' : 'text-red-600'}`}>
                  {(beroas.marginPct * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Breakeven ROAS</p>
                <p className="text-lg font-bold text-slate-900">{beroas.beRoas.toFixed(2)}x</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Current ROAS</p>
                {product.currentRoas ? (
                  <BeRoasIndicator actualRoas={product.currentRoas} beRoas={beroas.beRoas} showDetails={false} />
                ) : <p className="text-sm text-slate-400">N/A</p>}
              </div>
            </div>
            {product.projectedStockoutDate && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">
                  Projected stockout: {formatDate(product.projectedStockoutDate)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales chart */}
      {product.salesHistory.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Daily Sales (30 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={product.salesHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="units" stroke="#2563EB" strokeWidth={2} dot={false} name="Units" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2} dot={false} name="Revenue (EGP)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
