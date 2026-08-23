import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatPercent } from '@/lib/utils'

interface ReturnRow {
  productId: string; title: string; sku: string
  totalOrders: number; returns: number; returnRate: number
}

export default function Returns() {
  const [rows, setRows] = useState<ReturnRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ReturnRow[]>('/operations/returns')
      .then(d => setRows(d ?? []))
      .catch(() => toast.error('Failed to load returns'))
      .finally(() => setLoading(false))
  }, [])

  const highReturnRows = rows.filter(r => r.returnRate > 10)

  const columns: ColumnDef<ReturnRow>[] = [
    { key: 'title', header: 'Product', render: r => (
      <div className="flex items-center gap-2">
        {r.returnRate > 10 && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
        <div>
          <p className="font-medium text-sm">{r.title}</p>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-500">{r.sku}</p>
        </div>
      </div>
    )},
    { key: 'totalOrders', header: 'Units Sold', sortable: true, render: r => <span className="font-mono">{r.totalOrders}</span> },
    { key: 'returns', header: 'Returns', sortable: true, render: r => <span className="font-mono">{r.returns}</span> },
    { key: 'returnRate', header: 'Return Rate', sortable: true, render: r => (
      <span className={`font-semibold ${r.returnRate > 10 ? 'text-red-600 dark:text-red-400' : r.returnRate > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
        {formatPercent(r.returnRate ?? 0)}
      </span>
    )},
  ]

  const rowClassName = (row: ReturnRow) => row.returnRate > 10 ? 'bg-red-50 dark:bg-red-900/30' : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Returns</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Return rate analysis per product — products above 10% are flagged</p>
      </div>

      {highReturnRows.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{highReturnRows.length} product{highReturnRows.length > 1 ? 's' : ''} with return rate above 10%</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {highReturnRows.map(r => (
              <span key={r.productId} className="text-xs bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                {r.title} ({formatPercent(r.returnRate ?? 0)})
              </span>
            ))}
          </div>
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        exportFilename="returns"
        emptyTitle="No return data"
        emptyDescription="Connect Shopify and courier services to see return analytics."
        rowClassName={rowClassName}
      />
    </div>
  )
}
