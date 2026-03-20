import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
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
      const data = await api.get<{ data: Product[] }>(`/inventory?${params}`)
      setProducts(data.data ?? [])
    } catch { toast.error('Failed to load inventory') }
    finally { setLoading(false) }
  }, [collectionFilter, statusFilter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const collections = [...new Set(products.map(p => p.collection).filter(Boolean))] as string[]

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
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center"><Package size={14} className="text-slate-400" /></div>}
        <div>
          <p className="font-medium text-slate-900 text-sm">{p.title}</p>
          <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
        </div>
      </div>
    )},
    { key: 'collection', header: 'Collection', render: p => p.collection ? <Badge variant="info">{p.collection}</Badge> : <span className="text-slate-400">—</span> },
    { key: 'size', header: 'Size', render: p => p.size ? <Badge variant="muted">{p.size}</Badge> : <span className="text-slate-400">—</span> },
    { key: 'color', header: 'Color', render: p => p.color ?? '—' },
    {
      key: 'stockWarehouse', header: 'Warehouse', sortable: true,
      render: p => editingId === p.id ? (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <input
            className="w-16 h-7 text-sm border rounded px-2 text-center focus:outline-none focus:border-[#2563EB]"
            value={editQty}
            onChange={e => setEditQty(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInlineEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
            autoFocus
          />
          <button onClick={() => handleInlineEdit(p.id)} className="text-green-600 text-xs font-medium hover:text-green-800 cursor-pointer">Save</button>
          <button onClick={() => setEditingId(null)} className="text-slate-400 text-xs hover:text-slate-600 cursor-pointer">Cancel</button>
        </div>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); setEditingId(p.id); setEditQty(String(p.stockWarehouse)) }}
          className="font-mono text-sm hover:text-[#2563EB] cursor-pointer transition-colors duration-150"
        >
          {p.stockWarehouse}
        </button>
      )
    },
    { key: 'stockShopify', header: 'Shopify', sortable: true, render: p => <span className="font-mono text-sm">{p.stockShopify}</span> },
    { key: 'stockPhysical', header: 'Physical', sortable: true, render: p => <span className="font-mono text-sm">{p.stockPhysical}</span> },
    { key: 'unitsSold30d', header: 'Sold 30d', sortable: true, render: p => <span className="font-mono text-sm">{p.unitsSold30d}</span> },
    { key: 'sellThroughPct', header: 'Sell-through', sortable: true, render: p => <span className={`font-mono text-sm ${p.sellThroughPct >= 70 ? 'text-green-600' : p.sellThroughPct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{p.sellThroughPct.toFixed(1)}%</span> },
    { key: 'daysOfStockLeft', header: 'Days Left', sortable: true, render: p => (
      <span className={`font-mono text-sm font-semibold ${p.daysOfStockLeft <= 7 ? 'text-red-600' : p.daysOfStockLeft <= 14 ? 'text-amber-600' : 'text-green-600'}`}>
        {p.daysOfStockLeft === 0 ? '—' : `${Math.round(p.daysOfStockLeft)}d`}
      </span>
    )},
    { key: 'status', header: 'Status', render: p => <StatusBadge status={getStatusForProduct(p)} />, sortable: false },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and monitor your stock levels</p>
        </div>
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
