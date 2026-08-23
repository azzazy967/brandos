import { useState, useEffect, useMemo } from 'react'
import { Truck, Package, CheckCircle, XCircle, RotateCcw, Clock, ShieldCheck, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency } from '@/lib/utils'

interface OperationsSummary {
  ordersToday: number; ordersWeek: number
  deliveredMtd: number; failedMtd: number
  returnRatePct: number; avgDeliveryTimeDays: number
  courierCards: Array<{
    courier: string; inTransit: number; delivered: number; failed: number; returned: number
    codPending: number
  }>
  /** Optional: daily shipped/delivered timeline from the API */
  deliveryTimeline?: Array<{ date: string; shipped: number; delivered: number }>
}

/* ── Courier brand colours ── */
const COURIER_ICON_MAP: Record<string, { bg: string; text: string }> = {
  aramex: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  bosta: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' },
  jnt: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
  sprint: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
}

function courierBrand(name: string) {
  return COURIER_ICON_MAP[name.toLowerCase()] ?? { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' }
}

/* ── COD warning threshold ── */
const COD_WARNING_THRESHOLD = 30_000

/* ── Failure-rate colour helpers ── */
function failRateColor(pct: number): string {
  if (pct > 15) return 'text-red-600 dark:text-red-400'
  if (pct > 5) return 'text-amber-600 dark:text-amber-400'
  return 'text-green-600 dark:text-green-400'
}

function failRateBg(pct: number): string {
  if (pct > 15) return 'bg-red-500 dark:bg-red-500'
  if (pct > 5) return 'bg-amber-500 dark:bg-amber-500'
  return 'bg-green-500 dark:bg-green-500'
}

export default function OperationsDashboard() {
  const { resolved } = useThemeStore()
  const [data, setData] = useState<OperationsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<OperationsSummary>('/operations/summary')
      .then(setData)
      .catch(() => toast.error('Failed to load operations data'))
      .finally(() => setLoading(false))
  }, [])

  /* ── Derived metrics ── */

  // SLA compliance: delivered / (delivered + failed + returned) as a rough proxy
  const slaCompliancePct = useMemo(() => {
    if (!data) return 0
    const total = data.deliveredMtd + data.failedMtd
    return total > 0 ? Math.round((data.deliveredMtd / total) * 100) : 0
  }, [data])

  // Build delivery timeline from courier data if the API doesn't return it
  const timelineData = useMemo(() => {
    if (data?.deliveryTimeline?.length) return data.deliveryTimeline
    // Fallback: synthesise a single "today" bar from aggregate data so the chart is not empty
    if (!data?.courierCards?.length) return []
    const totalShipped = data.courierCards.reduce((s, c) => s + c.inTransit + c.delivered + c.failed, 0)
    const totalDelivered = data.courierCards.reduce((s, c) => s + c.delivered, 0)
    return [{ date: 'MTD', shipped: totalShipped, delivered: totalDelivered }]
  }, [data])

  // Per-courier failure rates
  const courierFailureRates = useMemo(() => {
    if (!data?.courierCards?.length) return []
    return data.courierCards.map(c => {
      const total = c.inTransit + c.delivered + c.failed + c.returned
      const pct = total > 0 ? (c.failed / total) * 100 : 0
      return { courier: c.courier, pct: Math.round(pct * 10) / 10, failed: c.failed, total }
    })
  }, [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Operations Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Shipment status and delivery performance</p>
      </div>

      {/* ─── KPI Grid (responsive: 2 -> 3 -> 6) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Orders Today" value={data?.ordersToday ?? 0} icon={Package} loading={loading} />
        <KpiCard title="Orders This Week" value={data?.ordersWeek ?? 0} icon={Package} loading={loading} />
        <KpiCard title="Delivered MTD" value={data?.deliveredMtd ?? 0} icon={CheckCircle} loading={loading} status="healthy" />
        <KpiCard title="Failed MTD" value={data?.failedMtd ?? 0} icon={XCircle} loading={loading} status={data?.failedMtd ? 'critical' : 'neutral'} />
        <KpiCard title="Return Rate" value={data?.returnRatePct ?? 0} format="percent" icon={RotateCcw} loading={loading} status={(data?.returnRatePct ?? 0) > 10 ? 'critical' : (data?.returnRatePct ?? 0) > 5 ? 'warning' : 'healthy'} />
        <KpiCard title="Avg Delivery" value={data?.avgDeliveryTimeDays ? `${data.avgDeliveryTimeDays.toFixed(1)}d` : '\u2014'} icon={Clock} loading={loading} />
      </div>

      {/* ─── SLA Compliance Callout ─── */}
      {!loading && data && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="py-4 flex items-center gap-4">
            {/* Circular progress indicator */}
            <div className="relative flex-shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke={resolved === 'dark' ? '#334155' : '#E2E8F0'}
                  strokeWidth="5"
                />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke={slaCompliancePct >= 90 ? '#22C55E' : slaCompliancePct >= 75 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={`${(slaCompliancePct / 100) * 175.93} 175.93`}
                  transform="rotate(-90 32 32)"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-slate-100">
                {slaCompliancePct}%
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className={slaCompliancePct >= 90 ? 'text-green-500' : slaCompliancePct >= 75 ? 'text-amber-500' : 'text-red-500'} />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">SLA Compliance</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {slaCompliancePct}% of orders delivered successfully (MTD: {data.deliveredMtd} delivered out of {data.deliveredMtd + data.failedMtd} total)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Delivery Timeline Chart ─── */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Timeline &mdash; Shipped vs Delivered</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="skeleton h-48 rounded" />
          ) : timelineData.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No delivery timeline data available</p>
          ) : (
            <div className="h-[240px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: resolved === 'dark' ? '#94A3B8' : '#64748B' }}
                    tickFormatter={d => d.length > 5 ? d.slice(5) : d}
                  />
                  <YAxis tick={{ fontSize: 11, fill: resolved === 'dark' ? '#94A3B8' : '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: resolved === 'dark' ? '#1E293B' : '#FFFFFF',
                      border: `1px solid ${resolved === 'dark' ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      color: resolved === 'dark' ? '#F1F5F9' : '#0F172A',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="shipped" fill="#3B82F6" name="Shipped" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delivered" fill="#22C55E" name="Delivered" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Failed Delivery Rate by Courier ─── */}
      {!loading && courierFailureRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Failed Delivery Rate by Courier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {courierFailureRates.map(({ courier, pct, failed, total }) => (
                <div key={courier} className="flex items-center gap-3">
                  <div className="w-24 flex-shrink-0">
                    <StatusBadge status={courier} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${failRateBg(pct)}`}
                          style={{ width: `${Math.min(pct * 3, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold font-mono w-14 text-right ${failRateColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {failed} failed out of {total} total shipments
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> &lt;5% Good</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> 5-15% Moderate</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> &gt;15% Critical</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Courier Breakdown Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)
        ) : (
          (data?.courierCards ?? []).map(courier => {
            const brand = courierBrand(courier.courier)
            const total = courier.inTransit + courier.delivered + courier.failed + courier.returned
            const failPct = total > 0 ? (courier.failed / total) * 100 : 0
            const isCodHigh = courier.codPending >= COD_WARNING_THRESHOLD
            return (
              <Card key={courier.courier} className="relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${brand.bg}`}>
                      <Truck size={18} className={brand.text} />
                    </div>
                    <StatusBadge status={courier.courier} />
                    {failPct > 15 && (
                      <span className="ml-auto flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertTriangle size={14} /> High failure
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'In Transit', value: courier.inTransit, color: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Delivered', value: courier.delivered, color: 'text-green-600 dark:text-green-400' },
                      { label: 'Failed', value: courier.failed, color: 'text-red-600 dark:text-red-400' },
                      { label: 'Returned', value: courier.returned, color: 'text-slate-500 dark:text-slate-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                        <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* COD Pending with conditional warning */}
                  <div className={`mt-3 p-3 rounded-lg border ${
                    isCodHigh
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${
                        isCodHigh
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        COD Pending: <strong>{formatCurrency(courier.codPending)}</strong>
                      </p>
                      {isCodHigh && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <AlertTriangle size={12} /> Needs collection
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
