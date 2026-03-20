import { useState, useEffect } from 'react'
import { Phone, RefreshCw, XCircle } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDate } from '@/lib/utils'

interface FailedDelivery {
  id: string; orderId: string; customerName?: string; customerPhone?: string
  courier: string; attempts: number; lastAttemptAt: string
  codAmount: number; city?: string; shipmentId: string
}

export default function FailedDeliveries() {
  const [records, setRecords] = useState<FailedDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const data = await api.get<FailedDelivery[]>('/operations/failed')
      setRecords(data ?? [])
    } catch { toast.error('Failed to load failed deliveries') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleRetry = async (shipmentId: string) => {
    setActionLoading(shipmentId)
    try {
      await api.post(`/operations/shipments/${shipmentId}/retry`)
      toast.success('Retry scheduled')
      fetchData()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Retry failed') }
    finally { setActionLoading(null) }
  }

  const handleCancel = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to cancel this shipment?')) return
    setActionLoading(shipmentId)
    try {
      await api.put(`/operations/shipments/${shipmentId}/cancel`)
      toast.success('Shipment cancelled')
      fetchData()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Cancel failed') }
    finally { setActionLoading(null) }
  }

  // Detect patterns
  const cityGroups = records.reduce<Record<string, number>>((acc, r) => {
    if (r.city) acc[r.city] = (acc[r.city] ?? 0) + 1
    return acc
  }, {})
  const problemCities = Object.entries(cityGroups).filter(([, count]) => count >= 3)

  const columns: ColumnDef<FailedDelivery>[] = [
    { key: 'orderId', header: 'Order ID', render: r => <span className="font-mono text-xs">{r.orderId.slice(0,12)}</span> },
    { key: 'customerName', header: 'Customer', render: r => (
      <div>
        <p className="text-sm">{r.customerName ?? '—'}</p>
        {r.city && <p className="text-xs text-slate-400">{r.city}</p>}
      </div>
    )},
    { key: 'courier', header: 'Courier', render: r => <StatusBadge status={r.courier} /> },
    { key: 'attempts', header: 'Attempts', sortable: true, render: r => (
      <span className={`font-mono font-semibold ${r.attempts >= 3 ? 'text-red-600' : 'text-amber-600'}`}>{r.attempts}</span>
    )},
    { key: 'lastAttemptAt', header: 'Last Attempt', sortable: true, render: r => formatDate(r.lastAttemptAt) },
    { key: 'codAmount', header: 'COD Amount', sortable: true, render: r => r.codAmount > 0 ? <span className="font-mono">{formatCurrency(r.codAmount)}</span> : <span className="text-slate-400">—</span> },
    {
      key: 'actions', header: 'Actions', sortable: false,
      render: r => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button
            size="sm" variant="secondary"
            loading={actionLoading === r.shipmentId}
            onClick={() => handleRetry(r.shipmentId)}
            className="gap-1 text-xs"
          >
            <RefreshCw size={12} />
            Retry
          </Button>
          {r.customerPhone && (
            <a
              href={`tel:${r.customerPhone}`}
              className="inline-flex items-center gap-1 h-8 px-3 text-xs font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
            >
              <Phone size={12} />
              Call
            </a>
          )}
          <Button
            size="sm" variant="destructive"
            loading={actionLoading === r.shipmentId}
            onClick={() => handleCancel(r.shipmentId)}
            className="gap-1 text-xs"
          >
            <XCircle size={12} />
            Cancel
          </Button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Failed Deliveries</h1>
        <p className="text-slate-500 text-sm mt-1">Track and resolve failed shipment attempts</p>
      </div>

      {problemCities.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm font-semibold text-amber-800 mb-1">Pattern Alert</p>
          {problemCities.map(([city, count]) => (
            <p key={city} className="text-sm text-amber-700">
              {count} failed deliveries to <strong>{city}</strong> this week — possible courier coverage issue
            </p>
          ))}
        </div>
      )}

      <DataTable
        data={records}
        columns={columns}
        loading={loading}
        exportFilename="failed-deliveries"
        emptyTitle="No failed deliveries"
        emptyDescription="All shipments are on track."
      />
    </div>
  )
}
