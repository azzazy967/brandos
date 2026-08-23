import { useState, useEffect, useMemo } from 'react'
import { DollarSign, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ZAxis,
} from 'recharts'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface ProfitRow {
  id: string; title: string; sku: string
  unitsSold: number; revenue: number; cogs: number
  avgShipping: number; adAttribution: number | null
  grossProfit: number; marginPct: number
}

function MarginBadge({ pct }: { pct: number }) {
  const cls = pct >= 40 ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400' : pct >= 20 ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{formatPercent(pct)}</span>
}

/* ── Custom Scatter Tooltip ─────────────────────────────────── */
function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: ProfitRow }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-slate-900 dark:text-slate-100">{d.title}</p>
      <p className="text-slate-500 dark:text-slate-400">Revenue: <span className="font-mono text-slate-700 dark:text-slate-200">{formatCurrency(d.revenue)}</span></p>
      <p className="text-slate-500 dark:text-slate-400">Margin: <span className="font-mono text-slate-700 dark:text-slate-200">{formatPercent(d.marginPct)}</span></p>
      <p className="text-slate-500 dark:text-slate-400">Units Sold: <span className="font-mono text-slate-700 dark:text-slate-200">{d.unitsSold}</span></p>
    </div>
  )
}

export default function Profitability() {
  const { resolved } = useThemeStore()
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

  /* ── Derived KPI values ──────────────────────────────────── */
  const kpis = useMemo(() => {
    if (!rows.length) return { totalProfit: 0, avgMargin: 0, best: '—', worst: '—' }
    const totalProfit = rows.reduce((s, r) => s + r.grossProfit, 0)
    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const byMargin = [...rows].sort((a, b) => b.marginPct - a.marginPct)
    return {
      totalProfit,
      avgMargin,
      best: byMargin[0]?.title ?? '—',
      worst: byMargin[byMargin.length - 1]?.title ?? '—',
    }
  }, [rows])

  /* ── Scatter data ────────────────────────────────────────── */
  const scatterData = useMemo(() =>
    rows.map(r => ({ ...r, z: r.unitsSold })),
    [rows],
  )

  const columns: ColumnDef<ProfitRow>[] = [
    { key: 'title', header: 'Product', render: r => (
      <div>
        <p className="font-medium text-sm">{r.title}</p>
        <p className="text-xs font-mono text-slate-400 dark:text-slate-500">{r.sku}</p>
      </div>
    )},
    { key: 'unitsSold', header: 'Units Sold', sortable: true, hideBelow: 'lg', render: r => <span className="font-mono">{r.unitsSold}</span> },
    { key: 'revenue', header: 'Revenue', sortable: true, render: r => <span className="font-mono">{formatCurrency(r.revenue)}</span> },
    { key: 'cogs', header: 'COGS', sortable: true, hideBelow: 'md', render: r => <span className="font-mono">{formatCurrency(r.cogs)}</span> },
    { key: 'avgShipping', header: 'Avg Shipping', sortable: true, hideBelow: 'md', render: r => <span className="font-mono">{formatCurrency(r.avgShipping)}</span> },
    { key: 'adAttribution', header: 'Ad Attribution', sortable: true, hideBelow: 'md', render: r => <span className="font-mono">{formatCurrency(r.adAttribution)}</span> },
    { key: 'grossProfit', header: 'Gross Profit', sortable: true, render: r => (
      <span className={`font-mono font-bold ${r.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(r.grossProfit)}</span>
    )},
    { key: 'marginPct', header: 'Margin %', sortable: true, render: r => <MarginBadge pct={r.marginPct} /> },
  ]

  const rowClassName = (row: ProfitRow) => {
    if (top5ids.has(row.id)) return 'bg-green-50 dark:bg-green-900/30'
    if (bot5ids.has(row.id)) return 'bg-red-50 dark:bg-red-900/30'
    return ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profitability</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Per-product revenue, COGS, and margin analysis</p>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Gross Profit"
          value={kpis.totalProfit}
          format="currency"
          icon={DollarSign}
          loading={loading}
          status={kpis.totalProfit > 0 ? 'healthy' : 'critical'}
        />
        <KpiCard
          title="Average Margin %"
          value={kpis.avgMargin}
          format="percent"
          icon={TrendingUp}
          loading={loading}
          status={kpis.avgMargin >= 30 ? 'healthy' : kpis.avgMargin >= 20 ? 'warning' : 'critical'}
        />
        <KpiCard
          title="Best Performing"
          value={kpis.best}
          format="raw"
          icon={Award}
          loading={loading}
          status="healthy"
          subtitle="Highest margin product"
        />
        <KpiCard
          title="Worst Performing"
          value={kpis.worst}
          format="raw"
          icon={AlertTriangle}
          loading={loading}
          status="critical"
          subtitle="Lowest margin product"
        />
      </div>

      {/* ── Scatter Plot — Margin vs Revenue ─────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profitability Map — Margin vs Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="skeleton h-64 rounded" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-12 text-center">No data to display</p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                  <XAxis
                    type="number"
                    dataKey="revenue"
                    name="Revenue"
                    tick={{ fontSize: 11, fill: resolved === 'dark' ? '#94A3B8' : '#64748B' }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    label={{ value: 'Revenue', position: 'insideBottom', offset: -5, fontSize: 11, fill: resolved === 'dark' ? '#94A3B8' : '#64748B' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="marginPct"
                    name="Margin %"
                    tick={{ fontSize: 11, fill: resolved === 'dark' ? '#94A3B8' : '#64748B' }}
                    tickFormatter={v => `${v}%`}
                    label={{ value: 'Margin %', angle: -90, position: 'insideLeft', fontSize: 11, fill: resolved === 'dark' ? '#94A3B8' : '#64748B' }}
                  />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} name="Units Sold" />
                  <Tooltip content={<ScatterTooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
                  <ReferenceLine
                    y={0}
                    stroke={resolved === 'dark' ? '#EF4444' : '#DC2626'}
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                    label={{ value: '0% margin', position: 'right', fontSize: 10, fill: resolved === 'dark' ? '#F87171' : '#DC2626' }}
                  />
                  <Scatter
                    data={scatterData}
                    fill="#2563EB"
                    fillOpacity={resolved === 'dark' ? 0.7 : 0.6}
                    stroke={resolved === 'dark' ? '#60A5FA' : '#1D4ED8'}
                    strokeWidth={1}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-200 dark:bg-green-800 inline-block" /> Top 5 most profitable</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-red-200 dark:bg-red-800 inline-block" /> Bottom 5 least profitable</span>
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
