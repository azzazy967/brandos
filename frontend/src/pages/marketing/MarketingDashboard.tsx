import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, BarChart, Bar
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Platform = 'all' | 'meta' | 'tiktok'
type DateRange = 'today' | '7d' | '30d'

interface MarketingSummary {
  totalSpend: number; attributedRevenue: number
  blendedRoas: number; orders: number; cpa: number
  beRoas: number
  spendDelta: number; roasDelta: number
  metaStats: { spend: number; revenue: number; roas: number; orders: number; cpm: number; cpc: number; ctr: number; convRate: number }
  tiktokStats: { spend: number; revenue: number; roas: number; orders: number; cpm: number; cpc: number; ctr: number; convRate: number }
  roasTrend: Array<{ date: string; roas: number; beRoas: number }>
  funnel: Array<{ stage: string; value: number }>
}

export default function MarketingDashboard() {
  const { resolved } = useThemeStore()
  const [data, setData] = useState<MarketingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<Platform>('all')
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  useEffect(() => {
    setLoading(true)
    api.get<MarketingSummary>(`/marketing/summary?platform=${platform}&range=${dateRange}`)
      .then(setData)
      .catch(() => toast.error('Failed to load marketing data'))
      .finally(() => setLoading(false))
  }, [platform, dateRange])

  const beRoas = data?.beRoas ?? 2

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Marketing Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Powered by Windsor.ai — unified Meta + TikTok data</p>
        </div>
        <div className="flex items-center gap-2">
          {(['today','7d','30d'] as DateRange[]).map(r => (
            <Button key={r} variant={dateRange === r ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(r)}>
              {r === 'today' ? 'Today' : r}
            </Button>
          ))}
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          {(['all','meta','tiktok'] as Platform[]).map(p => (
            <Button key={p} variant={platform === p ? 'secondary' : 'outline'} size="sm" onClick={() => setPlatform(p)}>
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 transition-all duration-300">
        <KpiCard title="Total Spend" value={data?.totalSpend ?? 0} format="currency" loading={loading} delta={data?.spendDelta} />
        <KpiCard title="Attributed Revenue" value={data?.attributedRevenue ?? 0} format="currency" loading={loading} />
        <KpiCard title="Blended ROAS" value={data?.blendedRoas ?? 0} format="roas" loading={loading} delta={data?.roasDelta} status={(data?.blendedRoas ?? 0) >= beRoas ? 'healthy' : 'critical'} />
        <KpiCard title="Orders" value={data?.orders ?? 0} format="number" loading={loading} />
        <KpiCard title="CPA" value={data?.cpa ?? 0} format="currency" loading={loading} subtitle="Cost per acquisition" />
      </div>

      {/* Meta vs TikTok comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300">
        {(['meta', 'tiktok'] as const).map(p => {
          const stats = p === 'meta' ? data?.metaStats : data?.tiktokStats
          return (
            <Card key={p}>
              <CardHeader>
                <CardTitle className={cn('capitalize', p === 'meta' ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400')}>{p}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-8 rounded" />)}</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: 'Spend', value: formatCurrency(stats?.spend ?? 0) },
                      { label: 'Revenue', value: formatCurrency(stats?.revenue ?? 0) },
                      { label: 'ROAS', value: `${(stats?.roas ?? 0).toFixed(2)}x` },
                      { label: 'Orders', value: stats?.orders ?? 0 },
                      { label: 'CPA', value: (stats?.orders ?? 0) > 0 ? formatCurrency((stats?.spend ?? 0) / (stats?.orders ?? 1)) : '—' },
                      { label: 'CPM', value: formatCurrency(stats?.cpm ?? 0) },
                      { label: 'CPC', value: formatCurrency(stats?.cpc ?? 0) },
                      { label: 'CTR', value: `${(stats?.ctr ?? 0).toFixed(2)}%` },
                      { label: 'Conv. Rate', value: `${(stats?.convRate ?? 0).toFixed(2)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                        <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ROAS trend with BEROAS reference line + green/red zone shading */}
      <Card className="transition-all duration-300">
        <CardHeader>
          <CardTitle>ROAS Trend vs Breakeven ROAS</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">Green zone = profitable. Red zone = below breakeven.</p>
        </CardHeader>
        <CardContent>
          {loading ? <div className="skeleton h-48 rounded" /> : (() => {
            const trendData = data?.roasTrend ?? []
            const maxRoas = Math.max(...trendData.map(d => d.roas), beRoas + 1)
            // Compute the beRoas position as a fraction of the Y-axis max for gradient split
            const beFraction = Math.min(Math.max(beRoas / maxRoas, 0), 1)
            // SVG gradient goes top-to-bottom, so the "offset" for the split is inverted
            const splitOffset = `${((1 - beFraction) * 100).toFixed(1)}%`

            return (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <defs>
                    {/* Gradient fill: green above beRoas, red below */}
                    <linearGradient id="roasZoneGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.25} />
                      <stop offset={splitOffset} stopColor="#22C55E" stopOpacity={0.08} />
                      <stop offset={splitOffset} stopColor="#EF4444" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.25} />
                    </linearGradient>
                    {/* Gradient for ROAS line fill */}
                    <linearGradient id="roasLineFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, maxRoas]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: resolved === 'dark' ? '#1E293B' : '#FFFFFF',
                      border: `1px solid ${resolved === 'dark' ? '#334155' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      color: resolved === 'dark' ? '#E2E8F0' : '#0F172A',
                    }}
                    formatter={(v: unknown) => typeof v === 'number' ? `${v.toFixed(2)}x` : '—'}
                  />
                  <Legend />
                  {/* Background zone shading: green above, red below beRoas */}
                  <Area
                    type="monotone"
                    dataKey={() => maxRoas}
                    fill="url(#roasZoneGradient)"
                    stroke="none"
                    name="Zone"
                    legendType="none"
                    tooltipType="none"
                    isAnimationActive={false}
                  />
                  {/* ROAS area with gradient fill below the line */}
                  <Area
                    type="monotone"
                    dataKey="roas"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#roasLineFill)"
                    name="Blended ROAS"
                    dot={false}
                    activeDot={{ r: 4, stroke: '#2563EB', strokeWidth: 2, fill: resolved === 'dark' ? '#1E293B' : '#FFFFFF' }}
                    animationDuration={600}
                    animationEasing="ease-out"
                  />
                  <ReferenceLine
                    y={beRoas}
                    stroke="#EF4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `BE-ROAS ${beRoas.toFixed(1)}x`,
                      position: 'right',
                      fontSize: 11,
                      fill: '#EF4444',
                      fontWeight: 600,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Budget Pacing Indicator */}
      {!loading && data && (() => {
        const totalSpend = data.totalSpend ?? 0
        // Derive a monthly budget estimate: use 30d spend as approximation if on 30d range,
        // or extrapolate from shorter ranges. This is a best-effort from available data.
        const now = new Date()
        const dayOfMonth = now.getDate()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const expectedPacePercent = (dayOfMonth / daysInMonth) * 100
        // Estimate monthly budget by projecting current spend to full month
        const projectedMonthly = dayOfMonth > 0 ? (totalSpend / dayOfMonth) * daysInMonth : totalSpend
        // Use projected monthly as the "budget" baseline (since we lack explicit budget data)
        const monthlyBudget = Math.round(projectedMonthly)
        const spentPercent = monthlyBudget > 0 ? Math.min((totalSpend / monthlyBudget) * 100, 100) : 0
        const isOverpacing = spentPercent > expectedPacePercent + 5
        const barColor = isOverpacing ? 'bg-red-500' : 'bg-green-500'
        const barTrack = 'bg-slate-200 dark:bg-slate-700'

        return (
          <Card className="transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-base">Budget Pacing</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">Estimated from current spend trajectory (Day {dayOfMonth}/{daysInMonth})</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">
                    Spent <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totalSpend)}</span> of <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(monthlyBudget)}</span> est. budget
                  </span>
                  <span className={cn('font-mono font-semibold', isOverpacing ? 'text-red-500' : 'text-green-500')}>
                    {spentPercent.toFixed(0)}%
                  </span>
                </div>
                <div className={cn('relative h-3 rounded-full overflow-hidden', barTrack)}>
                  {/* Expected pace marker */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                    style={{ left: `${expectedPacePercent}%` }}
                    title={`Expected pace: ${expectedPacePercent.toFixed(0)}%`}
                  />
                  <div
                    className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
                    style={{ width: `${spentPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>0%</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                    Expected pace: {expectedPacePercent.toFixed(0)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Funnel */}
      {(data?.funnel ?? []).length > 0 && (
        <Card className="transition-all duration-300">
          <CardHeader><CardTitle>Combined Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.funnel ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="value" fill="#2563EB" name="Count" radius={[0, 4, 4, 0]} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
