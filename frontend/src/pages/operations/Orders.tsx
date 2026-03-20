import { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Order {
  id: string; source: string; customerName?: string; customerPhone?: string
  totalAmount: number; paymentMethod: string; status: string
  shipmentStatus?: string; codStatus?: string; createdAt: string
  itemCount: number
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (sourceFilter) params.set('source', sourceFilter)
    api.get<Order[]>(`/operations/orders?${params}`)
      .then(d => setOrders(d ?? []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false))
  }, [statusFilter, sourceFilter])

  const columns: ColumnDef<Order>[] = [
    { key: 'id', header: 'Order ID', render: o => <span className="font-mono text-xs text-blue-600">{o.id.slice(0,12)}</span> },
    { key: 'source', header: 'Source', render: o => <StatusBadge status={o.source} /> },
    { key: 'customerName', header: 'Customer', render: o => (
      <div>
        <p className="text-sm">{o.customerName ?? '—'}</p>
        {o.customerPhone && <p className="text-xs text-slate-400">{o.customerPhone}</p>}
      </div>
    )},
    { key: 'itemCount', header: 'Items', render: o => <span className="font-mono">{o.itemCount}</span> },
    { key: 'totalAmount', header: 'Total', sortable: true, render: o => <span className="font-mono font-semibold">{formatCurrency(o.totalAmount)}</span> },
    { key: 'paymentMethod', header: 'Payment', render: o => <StatusBadge status={o.paymentMethod} /> },
    { key: 'status', header: 'Order Status', render: o => <StatusBadge status={o.status} /> },
    { key: 'shipmentStatus', header: 'Shipment', render: o => o.shipmentStatus ? <StatusBadge status={o.shipmentStatus} /> : <span className="text-slate-400">—</span> },
    { key: 'codStatus', header: 'COD', render: o => o.codStatus && o.codStatus !== 'not_applicable' ? <StatusBadge status={o.codStatus} /> : <span className="text-slate-400">—</span> },
    { key: 'createdAt', header: 'Date', sortable: true, render: o => formatDate(o.createdAt) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-slate-500 text-sm mt-1">All orders from Shopify and other channels</p>
      </div>

      <div className="flex gap-3">
        <Select
          options={[{ value: '', label: 'All Sources' }, { value: 'shopify', label: 'Shopify' }, { value: 'tiktok_shop', label: 'TikTok Shop' }]}
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="w-44"
          placeholder="All Sources"
        />
        <Select
          options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'processing', label: 'Processing' }, { value: 'delivered', label: 'Delivered' }, { value: 'failed', label: 'Failed' }, { value: 'returned', label: 'Returned' }]}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-44"
          placeholder="All Statuses"
        />
      </div>

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        exportFilename="orders"
        emptyTitle="No orders found"
        emptyDescription="Connect Shopify to see orders."
      />
    </div>
  )
}
