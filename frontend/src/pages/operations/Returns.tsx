import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatPercent } from '@/lib/utils'

interface ReturnRow {
  id: string; title: string; sku: string
  unitsSold: number; unitsReturned: number; returnRatePct: number
  commonReasons: string[]
}

export default function Returns() {
  const [rows, setRows] = useState<ReturnRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: ReturnRow[] }>('/operations/returns')
      .then(d => setRows(d.data ?? []))
      .catch(() => toast.error('Failed to load returns'))
      .finally(() => setLoading(false))
  }, [])

  const highReturnRows = rows.filter(r => r.returnRatePct > 10)

  const columns: ColumnDef<ReturnRow>[] = [
    { key: 'title', header: 'Product', render: r => (
      <div className="flex items-center gap-2">
        {r.returnRatePct > 10 && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
        <div>
          <p className="font-medium text-sm">{r.title}</p>
          <p className="text-xs font-mono text-slate-400">{r.sku}</p>
        </div>
      </div>
    )},
    { key: 'unitsSold', header: 'Units Sold', sortable: true, render: r => <span className="font-mono">{r.unitsSold}</span> },
    { key: 'unitsReturned', header: 'Returns', sortable: true, render: r => <span className="font-mono">{r.unitsReturned}</span> },
    { key: 'returnRatePct', header: 'Return Rate', sortable: true, render: r => (
      <span className={`font-semibold ${r.returnRatePct > 10 ? 'text-red-600' : r.returnRatePct > 5 ? 'text-amber-600' : 'text-green-600'}`}>
        {formatPercent(r.returnRatePct)}
      </span>
    )},
    { key: 'commonReasons', header: 'Common Reasons', sortable: false, render: r => (
      <div className="flex flex-wrap gap-1">
        {(r.commonReasons ?? []).slice(0, 3).map(reason => (
          <span key={reason} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{reason}</span>
        ))}
      </div>
    )},
  ]

  const rowClassName = (row: ReturnRow) => row.returnRatePct > 10 ? 'bg-red-50' : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Returns</h1>
        <p className="text-slate-500 text-sm mt-1">Return rate analysis per product — products above 10% are flagged</p>
      </div>

      {highReturnRows.length > 0 && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-semibold text-red-800">{highReturnRows.length} product{highReturnRows.length > 1 ? 's' : ''} with return rate above 10%</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {highReturnRows.map(r => (
              <span key={r.id} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {r.title} ({formatPercent(r.returnRatePct)})
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
