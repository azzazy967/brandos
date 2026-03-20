import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface PosOrder {
  id: string; orderNumber: string; eventId?: string; eventName?: string
  totalAmount: number; discountAmount: number; finalAmount: number
  paymentMethod: string; itemCount: number; createdAt: string
}

interface BazaarEvent { id: string; name: string }

export default function PosHistory() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PosOrder[]>([])
  const [events, setEvents] = useState<BazaarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    api.get<{ data: BazaarEvent[] }>('/pos/events')
      .then(d => setEvents(d.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (eventFilter) params.set('eventId', eventFilter)
    if (paymentFilter) params.set('paymentMethod', paymentFilter)
    if (dateFrom) params.set('from', dateFrom)
    if (dateTo) params.set('to', dateTo)

    api.get<{ data: PosOrder[] }>(`/pos/orders?${params}`)
      .then(d => setOrders(d.data ?? []))
      .catch(() => toast.error('Failed to load POS history'))
      .finally(() => setLoading(false))
  }, [eventFilter, paymentFilter, dateFrom, dateTo])

  const columns: ColumnDef<PosOrder>[] = [
    { key: 'orderNumber', header: 'Order #', render: o => <span className="font-mono text-sm text-blue-600">{o.orderNumber}</span> },
    { key: 'eventName', header: 'Event', render: o => o.eventName ? <span className="text-sm">{o.eventName}</span> : <span className="text-slate-400">—</span> },
    { key: 'itemCount', header: 'Items', render: o => <span className="font-mono">{o.itemCount}</span> },
    { key: 'finalAmount', header: 'Total', sortable: true, render: o => <span className="font-mono font-semibold">{formatCurrency(o.finalAmount)}</span> },
    { key: 'discountAmount', header: 'Discount', render: o => o.discountAmount > 0 ? <span className="font-mono text-green-600">-{formatCurrency(o.discountAmount)}</span> : <span className="text-slate-400">—</span> },
    { key: 'paymentMethod', header: 'Payment', render: o => <StatusBadge status={o.paymentMethod} /> },
    { key: 'createdAt', header: 'Date & Time', sortable: true, render: o => formatDateTime(o.createdAt) },
  ]

  // Daily totals
  const dailyTotals = orders.reduce<Record<string, number>>((acc, order) => {
    const day = order.createdAt.split('T')[0]
    acc[day] = (acc[day] ?? 0) + order.finalAmount
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">POS History</h1>
        <p className="text-slate-500 text-sm mt-1">All point-of-sale transactions</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          options={[{ value: '', label: 'All Events' }, ...events.map(e => ({ value: e.id, label: e.name }))]}
          value={eventFilter}
          onChange={e => setEventFilter(e.target.value)}
          className="w-48"
          placeholder="All Events"
        />
        <Select
          options={[{ value: '', label: 'All Payments' }, { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'instapay', label: 'InstaPay' }]}
          value={paymentFilter}
          onChange={e => setPaymentFilter(e.target.value)}
          className="w-44"
          placeholder="All Payments"
        />
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        <span className="self-center text-slate-400 text-sm">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
      </div>

      {/* Daily totals summary */}
      {Object.keys(dailyTotals).length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {Object.entries(dailyTotals).sort().reverse().slice(0, 7).map(([day, total]) => (
            <div key={day} className="shrink-0 p-3 bg-white rounded-xl border border-slate-200 min-w-28 text-center">
              <p className="text-xs text-slate-500">{day.slice(5)}</p>
              <p className="font-mono font-bold text-[#2563EB] text-sm">{formatCurrency(total)}</p>
            </div>
          ))}
        </div>
      )}

      <DataTable
        data={orders}
        columns={columns}
        loading={loading}
        exportFilename="pos-history"
        emptyTitle="No POS orders"
        emptyDescription="No transactions recorded yet. Start selling in POS mode."
        onRowClick={o => navigate(`/pos/orders/${o.id}`)}
      />
    </div>
  )
}
