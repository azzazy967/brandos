import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Package, Lightbulb, ChevronRight, AlertTriangle, TrendingDown, RotateCcw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BeRoasIndicator } from '@/components/shared/BeRoasIndicator'
import { KpiCard } from '@/components/shared/KpiCard'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
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

/* ---------- Velocity grade helpers ---------- */
type VelocityGrade = 'A' | 'B' | 'C' | 'D' | 'F'

function getVelocityGrade(sellThroughPct: number): VelocityGrade {
  if (sellThroughPct > 70) return 'A'
  if (sellThroughPct >= 50) return 'B'
  if (sellThroughPct >= 30) return 'C'
  if (sellThroughPct >= 15) return 'D'
  return 'F'
}

const gradeColors: Record<VelocityGrade, string> = {
  A: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-green-300 dark:ring-green-700',
  B: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 ring-blue-300 dark:ring-blue-700',
  C: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-amber-300 dark:ring-amber-700',
  D: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 ring-orange-300 dark:ring-orange-700',
  F: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-red-300 dark:ring-red-700',
}

/* ---------- Recommendation helpers ---------- */
interface Recommendation {
  icon: typeof Lightbulb
  text: string
}

function getRecommendations(
  sellThroughPct: number,
  daysLeft: number | null,
  marginPct: number,
): Recommendation[] {
  const recs: Recommendation[] = []
  if (sellThroughPct < 30)
    recs.push({ icon: TrendingDown, text: `Consider reducing price \u2014 sell-through is below 30% (${sellThroughPct.toFixed(0)}%)` })
  if (daysLeft !== null && daysLeft < 14)
    recs.push({ icon: AlertTriangle, text: `Restock soon \u2014 estimated stockout in ${Math.max(0, Math.round(daysLeft))} days` })
  if (daysLeft !== null && daysLeft > 365)
    recs.push({ icon: RotateCcw, text: 'Overstocked \u2014 consider running a promotion' })
  if (marginPct < 0)
    recs.push({ icon: AlertTriangle, text: 'Review pricing \u2014 this product has negative margin' })
  if (recs.length === 0)
    recs.push({ icon: Lightbulb, text: 'This product is performing well. No action needed right now.' })
  return recs
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { resolved } = useThemeStore()
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
    return <div className="text-center py-16"><p className="text-slate-500 dark:text-slate-400">Product not found</p></div>
  }

  const beroas = calculateProductBEROAS({
    sellingPrice: product.sellingPrice,
    cogs: product.costPrice,
    avgShippingCost: product.avgShippingCost ?? 50,
    overheadPerUnit: product.overheadPerUnit ?? 0,
  })

  /* Sell-through & velocity */
  const totalStock = product.stockWarehouse + product.stockShopify + product.stockPhysical
  const totalUnits = totalStock + product.unitsSold30d // approximation
  const sellThroughPct = totalUnits > 0 ? (product.unitsSold30d / totalUnits) * 100 : 0
  const grade = getVelocityGrade(sellThroughPct)

  /* Days left */
  const daysLeft = useMemo(() => {
    if (product.projectedStockoutDate) {
      const diff = (new Date(product.projectedStockoutDate).getTime() - Date.now()) / 86_400_000
      return diff
    }
    if (product.avgDailySales > 0) return totalStock / product.avgDailySales
    return null
  }, [product, totalStock])

  /* Recommendations */
  const recommendations = useMemo(
    () => getRecommendations(sellThroughPct, daysLeft, beroas.marginPct),
    [sellThroughPct, daysLeft, beroas.marginPct],
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/inventory" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          Inventory
        </Link>
        <ChevronRight size={14} className="shrink-0" />
        <Link to="/inventory" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          Stock Overview
        </Link>
        <ChevronRight size={14} className="shrink-0" />
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate">{product.title}</span>
      </nav>

      {/* Header — responsive: stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" className="self-start" onClick={() => navigate('/inventory')}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Package size={24} className="text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{product.title}</h1>
              {/* Velocity grade badge */}
              <span
                className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-sm font-bold ring-1 ${gradeColors[grade]}`}
                title={`Velocity grade ${grade} — ${sellThroughPct.toFixed(0)}% sell-through`}
              >
                {grade}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{product.sku}</span>
              {product.collection && <span className="text-xs text-slate-400">{product.collection}</span>}
              {product.size && <span className="text-xs text-slate-400">{product.size}</span>}
              {product.color && <span className="text-xs text-slate-400">{product.color}</span>}
            </div>
          </div>
        </div>
        <StatusBadge status={product.status} className="self-start sm:self-center" />
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
          <p className="text-xs text-slate-500 dark:text-slate-400">Warehouse</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.stockWarehouse}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Shopify</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{product.stockShopify}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Physical (POS)</p>
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
                  <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="stock" stroke="#2563EB" strokeWidth={2} dot={false} name="Stock" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">No stock history available</p>}
          </CardContent>
        </Card>

        {/* BEROAS card */}
        <Card>
          <CardHeader><CardTitle>BEROAS Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Gross Profit/unit</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(beroas.grossProfit)}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Margin %</p>
                <p className={`text-lg font-bold ${beroas.marginPct >= 0.3 ? 'text-green-600 dark:text-green-400' : beroas.marginPct >= 0.2 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(beroas.marginPct * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Breakeven ROAS</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{beroas.beRoas.toFixed(2)}x</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <p className="text-xs text-slate-500 dark:text-slate-400">Current ROAS</p>
                {product.currentRoas ? (
                  <BeRoasIndicator actualRoas={product.currentRoas} beRoas={beroas.beRoas} showDetails={false} />
                ) : <p className="text-sm text-slate-400">N/A</p>}
              </div>
            </div>
            {product.projectedStockoutDate && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
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
                <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
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

      {/* AI Recommendations */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={18} className="text-blue-600 dark:text-blue-400" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-white dark:bg-slate-800 p-4 shadow-sm"
              >
                <rec.icon size={20} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-slate-700 dark:text-slate-300">{rec.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
