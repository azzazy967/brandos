import { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface AttributionRow {
  id: string; title: string; sku: string
  adRevenue: number; organicRevenue: number; totalRevenue: number; adPct: number
}

export default function Attribution() {
  const [rows, setRows] = useState<AttributionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AttributionRow[]>('/marketing/attribution')
      .then(d => setRows(d ?? []))
      .catch(() => toast.error('Failed to load attribution'))
      .finally(() => setLoading(false))
  }, [])

  const columns: ColumnDef<AttributionRow>[] = [
    { key: 'title', header: 'Product', render: r => (
      <div>
        <p className="font-medium text-sm">{r.title}</p>
        <p className="text-xs font-mono text-slate-400">{r.sku}</p>
      </div>
    )},
    { key: 'adRevenue', header: 'Ad Revenue', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.adRevenue)}</span> },
    { key: 'organicRevenue', header: 'Organic Revenue', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.organicRevenue)}</span> },
    { key: 'totalRevenue', header: 'Total Revenue', sortable: true, render: r => <span className="font-mono font-semibold">{formatCurrency(r.totalRevenue)}</span> },
    { key: 'adPct', header: '% from Ads', sortable: true, render: r => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-20">
          <div className="bg-[#2563EB] h-1.5 rounded-full" style={{ width: `${Math.min(r.adPct, 100)}%` }} />
        </div>
        <span className="font-mono text-sm">{formatPercent(r.adPct)}</span>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Attribution</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ad-attributed revenue vs organic revenue per product</p>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        exportFilename="attribution"
        emptyTitle="No attribution data"
        emptyDescription="Connect Windsor.ai and Shopify to see revenue attribution."
      />
    </div>
  )
}
