import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'

import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { exportToCSV } from '@/lib/utils'

interface RestockItem {
  id: string; title: string; sku: string; collection?: string; size?: string; color?: string
  currentStock: number; avgDailySales: number; daysOfStockLeft: number
  suggestedQty: number; overrideQty?: number
}

export default function RestockPlanner() {
  const [items, setItems] = useState<RestockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  useEffect(() => {
    api.get<{ data: RestockItem[] }>('/inventory/restock')
      .then(d => setItems(d.data ?? []))
      .catch(() => toast.error('Failed to load restock data'))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = () => {
    const exportData = items.map(item => ({
      SKU: item.sku,
      Product: item.title,
      Collection: item.collection ?? '',
      Size: item.size ?? '',
      Color: item.color ?? '',
      'Current Stock': item.currentStock,
      'Avg Daily Sales': item.avgDailySales.toFixed(2),
      'Days of Stock': Math.round(item.daysOfStockLeft),
      'Suggested Qty': overrides[item.id] ?? item.suggestedQty,
    }))
    exportToCSV(exportData, 'restock-planner')
  }

  const columns: ColumnDef<RestockItem>[] = [
    { key: 'sku', header: 'SKU', render: i => <span className="font-mono text-xs">{i.sku}</span> },
    { key: 'title', header: 'Product', render: i => (
      <div>
        <p className="font-medium text-sm">{i.title}</p>
        <p className="text-xs text-slate-400">{[i.collection, i.size, i.color].filter(Boolean).join(' · ')}</p>
      </div>
    )},
    { key: 'currentStock', header: 'Current Stock', sortable: true, render: i => <span className="font-mono">{i.currentStock}</span> },
    { key: 'avgDailySales', header: 'Avg Daily Sales', sortable: true, render: i => <span className="font-mono">{i.avgDailySales.toFixed(1)}</span> },
    { key: 'daysOfStockLeft', header: 'Days Left', sortable: true, render: i => (
      <span className={`font-mono font-semibold ${i.daysOfStockLeft <= 7 ? 'text-red-600' : i.daysOfStockLeft <= 14 ? 'text-amber-600' : 'text-green-600'}`}>
        {Math.round(i.daysOfStockLeft)}d
      </span>
    )},
    { key: 'suggestedQty', header: 'Suggested Restock', sortable: true, render: i => (
      <span className="font-mono font-bold text-[#2563EB]">{i.suggestedQty}</span>
    )},
    { key: 'overrideQty', header: 'Your Order Qty', sortable: false, render: i => (
      <input
        type="number"
        className="w-20 h-8 text-sm border border-slate-200 rounded-lg px-2 text-center focus:outline-none focus:border-[#2563EB] transition-colors"
        placeholder={String(i.suggestedQty)}
        value={overrides[i.id] ?? ''}
        onChange={e => setOverrides(prev => ({ ...prev, [i.id]: e.target.value }))}
        onClick={e => e.stopPropagation()}
      />
    )},
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Restock Planner</h1>
          <p className="text-slate-500 text-sm mt-1">SKUs that need restocking based on 45-day supply target</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2">
          <Download size={16} />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Critical (&lt;7 days)</p>
          <p className="text-2xl font-bold text-red-700">{items.filter(i => i.daysOfStockLeft <= 7).length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-600 font-medium">Low (7–14 days)</p>
          <p className="text-2xl font-bold text-amber-700">{items.filter(i => i.daysOfStockLeft > 7 && i.daysOfStockLeft <= 14).length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Total SKUs to restock</p>
          <p className="text-2xl font-bold text-blue-700">{items.length}</p>
        </div>
      </div>

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        exportFilename="restock-planner"
        emptyTitle="No restocking needed"
        emptyDescription="All products have sufficient stock levels."
      />
    </div>
  )
}
