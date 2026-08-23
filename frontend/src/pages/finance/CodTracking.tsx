import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { KpiCard } from '@/components/shared/KpiCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, TrendingUp } from 'lucide-react'

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

const AGING_BUCKETS = [
  { label: '0-7 days', color: '#22C55E', darkColor: '#4ADE80' },
  { label: '7-14 days', color: '#F59E0B', darkColor: '#FBBF24' },
  { label: '14+ days', color: '#EF4444', darkColor: '#F87171' },
] as const

export default function CodTracking() {
  const { resolved } = useThemeStore()
  const [data, setData] = useState<CodSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<CodSummary>('/finance/cod')
      .then(setData)
      .catch(() => toast.error('Failed to load COD data'))
      .finally(() => setLoading(false))
  }, [])

  // Collection efficiency: collected / (collected + pending + lost) * 100
  const collectionEfficiency = useMemo(() => {
    if (!data) return 0
    const total = (data.totalCollectedMtd ?? 0) + (data.totalPending ?? 0) + (data.totalLost ?? 0)
    if (total === 0) return 0
    return Math.round(((data.totalCollectedMtd ?? 0) / total) * 100)
  }, [data])

  // Aging distribution: bucket amounts from records
  const agingDistribution = useMemo(() => {
    const records = data?.records ?? []
    const buckets = [
      { name: '0-7 days', amount: 0, count: 0 },
      { name: '7-14 days', amount: 0, count: 0 },
      { name: '14+ days', amount: 0, count: 0 },
    ]
    for (const r of records) {
      if (r.daysSinceShipped <= 7) {
        buckets[0].amount += r.amount
        buckets[0].count += 1
      } else if (r.daysSinceShipped <= 14) {
        buckets[1].amount += r.amount
        buckets[1].count += 1
      } else {
        buckets[2].amount += r.amount
        buckets[2].count += 1
      }
    }
    return buckets
  }, [data])

  // Per-courier breakdown: group pending amounts by courier
  const courierBreakdown = useMemo(() => {
    const records = data?.records ?? []
    const map = new Map<string, number>()
    for (const r of records) {
      if (r.courier) {
        map.set(r.courier, (map.get(r.courier) ?? 0) + r.amount)
      }
    }
    return Array.from(map.entries())
      .map(([courier, amount]) => ({ courier, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [data])

  const columns: ColumnDef<CodRecord>[] = [
    { key: 'orderId', header: 'Order ID', render: r => <span className="font-mono text-xs">{r.orderId}</span> },
    { key: 'customerName', header: 'Customer', hideBelow: 'md', render: r => r.customerName ?? '—' },
    { key: 'amount', header: 'COD Amount', sortable: true, render: r => <span className="font-mono font-semibold">{formatCurrency(r.amount)}</span> },
    { key: 'courier', header: 'Courier', render: r => <StatusBadge status={r.courier} /> },
    { key: 'shipmentStatus', header: 'Shipment', hideBelow: 'md', render: r => <StatusBadge status={r.shipmentStatus} /> },
    { key: 'codStatus', header: 'COD Status', render: r => <StatusBadge status={r.codStatus} /> },
    {
      key: 'daysSinceShipped', header: 'Aging', sortable: true,
      render: r => {
        const v = getAgingVariant(r.daysSinceShipped)
        const colorMap = { success: 'text-green-600 dark:text-green-400', warning: 'text-amber-600 dark:text-amber-400', danger: 'text-red-600 dark:text-red-400', muted: 'text-slate-500 dark:text-slate-400' }
        return <span className={`font-mono font-semibold ${colorMap[v]}`}>{r.daysSinceShipped}d</span>
      }
    },
    { key: 'shippedAt', header: 'Shipped', hideBelow: 'md', render: r => formatDate(r.shippedAt) },
  ]

  const rowClassName = (row: CodRecord) => {
    if (row.daysSinceShipped > 14) return 'bg-red-50 dark:bg-red-900/30'
    if (row.daysSinceShipped > 7) return 'bg-amber-50 dark:bg-amber-900/30'
    return ''
  }

  const isDark = resolved === 'dark'
  const bucketColors = AGING_BUCKETS.map(b => isDark ? b.darkColor : b.color)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">COD Tracking</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Monitor cash-on-delivery collection status and aging</p>
      </div>

      {/* KPI grid — responsive: 1 col on mobile, 4 cols on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Pending" value={data?.totalPending ?? 0} format="currency" icon={DollarSign} loading={loading} status="warning" />
        <KpiCard title="Collected MTD" value={data?.totalCollectedMtd ?? 0} format="currency" icon={DollarSign} loading={loading} status="healthy" />
        <KpiCard title="Total Lost" value={data?.totalLost ?? 0} format="currency" icon={DollarSign} loading={loading} status="critical" />
        <KpiCard
          title="Collection Efficiency"
          value={`${collectionEfficiency}%`}
          icon={TrendingUp}
          loading={loading}
          status={collectionEfficiency >= 80 ? 'healthy' : collectionEfficiency >= 50 ? 'warning' : 'critical'}
          subtitle="Collected / Total COD"
        />
      </div>

      {/* COD aging distribution chart */}
      {!loading && (data?.records?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>COD Aging Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingDistribution} layout="horizontal" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#F1F5F9'} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [
                    formatCurrency(value),
                    'Amount',
                  ]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                    borderRadius: '8px',
                    color: isDark ? '#E2E8F0' : '#1E293B',
                  }}
                />
                <Bar dataKey="amount" name="COD Amount" radius={[4, 4, 0, 0]}>
                  {agingDistribution.map((_, idx) => (
                    <Cell key={idx} fill={bucketColors[idx]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-courier COD breakdown */}
      {!loading && courierBreakdown.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Pending by Courier:</span>
          {courierBreakdown.map(({ courier, amount }) => (
            <span
              key={courier}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-sm"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">{courier}:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(amount)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-200 dark:bg-green-800 inline-block" /> 0-7 days (normal)</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-200 dark:bg-amber-800 inline-block" /> 7-14 days (follow up)</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-200 dark:bg-red-800 inline-block" /> 14+ days (urgent)</span>
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
