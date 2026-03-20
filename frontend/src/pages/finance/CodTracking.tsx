import { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { KpiCard } from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'

import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

interface CodRecord {
  id: string; orderId: string; customerName?: string
  amount: number; courier: string; shipmentStatus: string; codStatus: string
  daysSinceShipped: number; shippedAt: string
}

interface CodSummary {
  totalPending: number; totalCollectedMtd: number; totalLost: number
  records: CodRecord[]
}

function getAgingVariant(days: number): 'success' | 'warning' | 'danger' | 'muted' {
  if (days <= 7) return 'success'
  if (days <= 14) return 'warning'
  return 'danger'
}

export default function CodTracking() {
  const [data, setData] = useState<CodSummary | null>(null)
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    api.get<CodSummary>('/finance/cod')
      .then(setData)
      .catch(() => toast.error('Failed to load COD data'))
      .finally(() => setLoading(false))
  }, [])

  const columns: ColumnDef<CodRecord>[] = [
    { key: 'orderId', header: 'Order ID', render: r => <span className="font-mono text-xs">{r.orderId}</span> },
    { key: 'customerName', header: 'Customer', render: r => r.customerName ?? '—' },
    { key: 'amount', header: 'COD Amount', sortable: true, render: r => <span className="font-mono font-semibold">{formatCurrency(r.amount)}</span> },
    { key: 'courier', header: 'Courier', render: r => <StatusBadge status={r.courier} /> },
    { key: 'shipmentStatus', header: 'Shipment', render: r => <StatusBadge status={r.shipmentStatus} /> },
    { key: 'codStatus', header: 'COD Status', render: r => <StatusBadge status={r.codStatus} /> },
    {
      key: 'daysSinceShipped', header: 'Days Since Shipped', sortable: true,
      render: r => {
        const v = getAgingVariant(r.daysSinceShipped)
        const colorMap = { success: 'text-green-600', warning: 'text-amber-600', danger: 'text-red-600', muted: 'text-slate-500' }
        return <span className={`font-mono font-semibold ${colorMap[v]}`}>{r.daysSinceShipped}d</span>
      }
    },
    { key: 'shippedAt', header: 'Shipped', render: r => formatDate(r.shippedAt) },
  ]

  const rowClassName = (row: CodRecord) => {
    if (row.daysSinceShipped > 14) return 'bg-red-50'
    if (row.daysSinceShipped > 7) return 'bg-amber-50'
    return ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">COD Tracking</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor cash-on-delivery collection status and aging</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="Total Pending" value={data?.totalPending ?? 0} format="currency" icon={DollarSign} loading={loading} status="warning" />
        <KpiCard title="Collected MTD" value={data?.totalCollectedMtd ?? 0} format="currency" icon={DollarSign} loading={loading} status="healthy" />
        <KpiCard title="Total Lost" value={data?.totalLost ?? 0} format="currency" icon={DollarSign} loading={loading} status="critical" />
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-200 inline-block" /> 0–7 days (normal)</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-200 inline-block" /> 7–14 days (follow up)</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-200 inline-block" /> 14+ days (urgent)</span>
      </div>

      <DataTable
        data={data?.records ?? []}
        columns={columns}
        loading={loading}
        exportFilename="cod-tracking"
        emptyTitle="No COD records"
        emptyDescription="No pending COD shipments found."
        rowClassName={rowClassName}
      />
    </div>
  )
}
