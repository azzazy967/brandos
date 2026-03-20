import { useState, useEffect } from 'react'
import { Truck, Package, CheckCircle, XCircle, RotateCcw, Clock } from 'lucide-react'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency } from '@/lib/utils'

interface OperationsSummary {
  ordersToday: number; ordersWeek: number
  deliveredMtd: number; failedMtd: number
  returnRatePct: number; avgDeliveryTimeDays: number
  courierCards: Array<{
    courier: string; inTransit: number; delivered: number; failed: number; returned: number
    codPending: number
  }>
}

export default function OperationsDashboard() {
  const [data, setData] = useState<OperationsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<OperationsSummary>('/operations/summary')
      .then(setData)
      .catch(() => toast.error('Failed to load operations data'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Operations Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Shipment status and delivery performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Orders Today" value={data?.ordersToday ?? 0} icon={Package} loading={loading} />
        <KpiCard title="Orders This Week" value={data?.ordersWeek ?? 0} icon={Package} loading={loading} />
        <KpiCard title="Delivered MTD" value={data?.deliveredMtd ?? 0} icon={CheckCircle} loading={loading} status="healthy" />
        <KpiCard title="Failed MTD" value={data?.failedMtd ?? 0} icon={XCircle} loading={loading} status={data?.failedMtd ? 'critical' : 'neutral'} />
        <KpiCard title="Return Rate" value={data?.returnRatePct ?? 0} format="percent" icon={RotateCcw} loading={loading} status={(data?.returnRatePct ?? 0) > 10 ? 'critical' : (data?.returnRatePct ?? 0) > 5 ? 'warning' : 'healthy'} />
        <KpiCard title="Avg Delivery" value={data?.avgDeliveryTimeDays ? `${data.avgDeliveryTimeDays.toFixed(1)}d` : '—'} icon={Clock} loading={loading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)
        ) : (
          (data?.courierCards ?? []).map(courier => (
            <Card key={courier.courier}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck size={18} className="text-[#2563EB]" />
                  <StatusBadge status={courier.courier} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'In Transit', value: courier.inTransit, color: 'text-blue-600' },
                    { label: 'Delivered', value: courier.delivered, color: 'text-green-600' },
                    { label: 'Failed', value: courier.failed, color: 'text-red-600' },
                    { label: 'Returned', value: courier.returned, color: 'text-slate-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-700">COD Pending: <strong>{formatCurrency(courier.codPending)}</strong></p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

