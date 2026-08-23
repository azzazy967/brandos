import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Boxes, DollarSign, AlertTriangle, XCircle, Archive } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { KpiCard } from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'

import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'


interface Product {
  id: string; title: string; sku: string; collection?: string
  size?: string; color?: string; imageUrl?: string
  stockWarehouse: number; stockShopify: number; stockPhysical: number
  sellingPrice: number; costPrice: number
  unitsSold30d: number; sellThroughPct: number; daysOfStockLeft: number
  status: string
}

function getStatusForProduct(p: Product): string {
  const total = p.stockWarehouse + p.stockPhysical
  if (total === 0) return 'out_of_stock'
  if (total <= 5) return 'critical'
  if (p.unitsSold30d === 0) return 'dead_stock'
  if (total <= 10) return 'low_stock'
  return 'healthy'
}

function StockBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const color =
    pct <= 15 ? 'bg-red-500' :
    pct <= 40 ? 'bg-amber-500' :
    'bg-green-500'

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm w-8 text-right">{value}</span>
      <div className="flex-1 h-2 min-w-[48px] max-w-[80px] rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function InventoryList() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [collectionFilter, setCollectionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (collectionFilter) params.set('collection', collectionFilter)
      if (statusFilter) params.set('status', statusFilter)
      const data = await api.get<Product[]>(`/inventory?${params}`)
      setProducts(data ?? [])
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }, [collectionFilter, statusFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const collections = [...new Set(products.map(p => p.collection).filter(Boolean))] as string[]

  /* ─── KPI computations ─── */
  const kpis = useMemo(() => {
    const totalSKUs = products.length
    const totalStockValue = products.reduce((sum, p) => sum + p.stockWarehouse * p.costPrice, 0)
    const totalUnits = products.reduce((sum, p) => sum + p.stockWarehouse + p.stockPhysical, 0)
    const statuses = products.map(getStatusForProduct)
    const lowStockCount = statuses.filter(s => s === 'low_stock' || s === 'critical').length
    const outOfStockCount = statuses.filter(s => s === 'out_of_stock').length
    const deadStockCount = statuses.filter(s => s === 'dead_stock').length
    return { totalSKUs, totalStockValue, totalUnits, lowStockCount, outOfStockCount, deadStockCount }
  }, [products])

  const maxWarehouseStock = useMemo(
    () => Math.max(1, ...products.map(p => p.stockWarehouse)),
    [products]
  )

  const handleInlineEdit = async (productId: string) => {
    const qty = Number(editQty)
    if (isNaN(qty) || qty < 0) { toast.error('Invalid quantity'); return }
    try {
      await api.put(`/inventory/${productId}`, { stockWarehouse: qty })
      toast.success('Stock updated')
      setEditingId(null)
      fetchProducts()
    } catch { toast.error('Failed to update stock') }
  }

  const columns: ColumnDef<Product>[] = [
    { key: 'title', header: 'Product', render: p => (
      <div className="flex items-center gap-2">
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center"><Package size={16} className="text-slate-400" /></div>}
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{p.title}</p>
          <p className="text-xs text-slate-400 font-mono hidden md:block">{p.sku}</p>
        </div>
      </div>
    )},
    { key: 'collection', header: 'Collection', hideBelow: 'md' as const, render: p => p.collection ? <Badge variant="info">{p.collection}</Badge> : <span className="text-slate-400">—</span> },
    { key: 'size', header: 'Size', hideBelow: 'md' as const, render: p => p.size ? <Badge variant="muted">{p.size}</Badge> : <span className="text-slate-400">—</span> },
    { key: 'color', header: 'Color', hideBelow: 'lg' as const, render: p => p.color ?? '—' },
    {
      key: 'stockWarehouse', header: 'Warehouse', sortable: true,
      render: p => editingId === p.id ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input
            className="w-16 h-7 text-sm border rounded px-2 text-center focus:outline-none focus:border-[#2563EB] dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            value={editQty}
            onChange={e => setEditQty(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
            autoFocus
          />
          <button onClick={() => handleInlineEdit(p.id)} className="text-green-600 dark:text-green-400 text-xs font-medium hover:text-green-800 cursor-pointer">Save</button>
          <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">Cancel</button>
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setEditingId(p.id); setEditQty(String(p.stockWarehouse)) }}
          className="w-full cursor-pointer transition-colors duration-150 hover:text-[#2563EB]"
        >
          <StockBar value={p.stockWarehouse} max={maxWarehouseStock} />
        </button>
      )
    },
    { key: 'stockShopify', header: 'Shopify', sortable: true, hideBelow: 'md' as const, render: p => <span className="font-mono text-sm">{p.stockShopify}</span> },
    { key: 'stockPhysical', header: 'Physical', sortable: true, hideBelow: 'md' as const, render: p => <span className="font-mono text-sm">{p.stockPhysical}</span> },
    { key: 'unitsSold30d', header: 'Sold 30d', sortable: true, hideBelow: 'md' as const, render: p => <span className="font-mono text-sm">{p.unitsSold30d}</span> },
    { key: 'sellThroughPct', header: 'Sell-through', sortable: true, hideBelow: 'md' as const, render: p => <span className={`font-mono text-sm ${p.sellThroughPct >= 70 ? 'text-green-600 dark:text-green-400' : p.sellThroughPct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>{(p.sellThroughPct ?? 0).toFixed(1)}%</span> },
    { key: 'daysOfStockLeft', header: 'Days Left', sortable: true, hideBelow: 'lg' as const, render: p => (
      <span className={`font-mono text-sm font-semibold ${p.daysOfStockLeft == null || p.daysOfStockLeft <= 7 ? 'text-red-600 dark:text-red-400' : p.daysOfStockLeft <= 14 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
        {p.daysOfStockLeft == null || p.daysOfStockLeft === 0 ? '—' : `${Math.round(p.daysOfStockLeft)}d`}
      </span>
    )},
    { key: 'status', header: 'Status', render: p => <StatusBadge status={getStatusForProduct(p)} />, sortable: false },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and monitor your stock levels</p>
        </div>
      </div>

      {/* ─── KPI Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total SKUs"
          value={kpis.totalSKUs}
          format="number"
          icon={Boxes}
          status="neutral"
          loading={loading}
          subtitle={`${kpis.totalUnits} total units`}
        />
        <KpiCard
          title="Stock Value"
          value={kpis.totalStockValue}
          format="currency"
          icon={DollarSign}
          status="neutral"
          loading={loading}
          subtitle="warehouse cost basis"
        />
        <KpiCard
          title="Low Stock"
          value={kpis.lowStockCount}
          format="number"
          icon={AlertTriangle}
          status={kpis.lowStockCount > 0 ? 'warning' : 'healthy'}
          loading={loading}
          subtitle="low + critical"
        />
        <KpiCard
          title="Out of Stock"
          value={kpis.outOfStockCount}
          format="number"
          icon={XCircle}
          status={kpis.outOfStockCount > 0 ? 'critical' : 'healthy'}
          loading={loading}
          subtitle="zero inventory"
        />
        <KpiCard
          title="Dead Stock"
          value={kpis.deadStockCount}
          format="number"
          icon={Archive}
          status={kpis.deadStockCount > 0 ? 'warning' : 'healthy'}
          loading={loading}
          subtitle="no sales in 30d"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={[{ value: '', label: 'All Collections' }, ...collections.map(c => ({ value: c, label: c }))]}
          value={collectionFilter}
          onChange={e => setCollectionFilter(e.target.value)}
          className="w-48"
          placeholder="All Collections"
        />
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'healthy', label: 'Healthy' },
            { value: 'low_stock', label: 'Low Stock' },
            { value: 'critical', label: 'Critical' },
            { value: 'out_of_stock', label: 'Out of Stock' },
            { value: 'dead_stock', label: 'Dead Stock' },
          ]}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-48"
          placeholder="All Statuses"
        />
      </div>

      <DataTable
        data={products}
        columns={columns}
        loading={loading}
        exportFilename="inventory"
        emptyTitle="No products found"
        emptyDescription="Connect Shopify or add products manually to see inventory."
        onRowClick={p => navigate(`/inventory/${p.id}`)}
      />
    </div>
  )
}
