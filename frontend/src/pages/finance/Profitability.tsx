import { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface ProfitRow {
  id: string; title: string; sku: string
  unitsSold: number; revenue: number; cogs: number
  avgShipping: number; adAttribution: number
  grossProfit: number; marginPct: number
}

function MarginBadge({ pct }: { pct: number }) {
  const cls = pct >= 40 ? 'bg-green-100 text-green-700' : pct >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{formatPercent(pct)}</span>
}

export default function Profitability() {
  const [rows, setRows] = useState<ProfitRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ProfitRow[]>('/finance/profitability')
      .then(d => setRows(d ?? []))
      .catch(() => toast.error('Failed to load profitability'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...rows].sort((a, b) => b.grossProfit - a.grossProfit)
  const top5ids = new Set(sorted.slice(0, 5).map(r => r.id))
  const bot5ids = new Set(sorted.slice(-5).map(r => r.id))

  const columns: ColumnDef<ProfitRow>[] = [
    { key: 'title', header: 'Product', render: r => (
      <div>
        <p className="font-medium text-sm">{r.title}</p>
        <p className="text-xs font-mono text-slate-400">{r.sku}</p>
      </div>
    )},
    { key: 'unitsSold', header: 'Units Sold', sortable: true, render: r => <span className="font-mono">{r.unitsSold}</span> },
    { key: 'revenue', header: 'Revenue', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.revenue)}</span> },
    { key: 'cogs', header: 'COGS', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.cogs)}</span> },
    { key: 'avgShipping', header: 'Avg Shipping', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.avgShipping)}</span> },
    { key: 'adAttribution', header: 'Ad Attribution', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.adAttribution)}</span> },
    { key: 'grossProfit', header: 'Gross Profit', sortable: true, render: r => (
      <span className={`font-mono font-bold ${r.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(r.grossProfit)}</span>
    )},
    { key: 'marginPct', header: 'Margin %', sortable: true, render: r => <MarginBadge pct={r.marginPct} /> },
  ]

  const rowClassName = (row: ProfitRow) => {
    if (top5ids.has(row.id)) return 'bg-green-50'
    if (bot5ids.has(row.id)) return 'bg-red-50'
    return ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profitability</h1>
        <p className="text-slate-500 text-sm mt-1">Per-product revenue, COGS, and margin analysis</p>
      </div>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-200 inline-block" /> Top 5 most profitable</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-200 inline-block" /> Bottom 5 least profitable</span>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        loading={loading}
        exportFilename="profitability"
        emptyTitle="No profitability data"
        emptyDescription="Connect Shopify and enter COGS to see profitability analysis."
        rowClassName={rowClassName}
      />
    </div>
  )
}
