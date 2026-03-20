import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, BarChart, Bar
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
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
          <h1 className="text-2xl font-bold text-slate-900">Marketing Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Powered by Windsor.ai — unified Meta + TikTok data</p>
        </div>
        <div className="flex items-center gap-2">
          {(['today','7d','30d'] as DateRange[]).map(r => (
            <Button key={r} variant={dateRange === r ? 'default' : 'outline'} size="sm" onClick={() => setDateRange(r)}>
              {r === 'today' ? 'Today' : r}
            </Button>
          ))}
          <div className="w-px h-6 bg-slate-200 mx-1" />
          {(['all','meta','tiktok'] as Platform[]).map(p => (
            <Button key={p} variant={platform === p ? 'secondary' : 'outline'} size="sm" onClick={() => setPlatform(p)}>
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard title="Total Spend" value={data?.totalSpend ?? 0} format="currency" loading={loading} delta={data?.spendDelta} />
        <KpiCard title="Attributed Revenue" value={data?.attributedRevenue ?? 0} format="currency" loading={loading} />
        <KpiCard title="Blended ROAS" value={data?.blendedRoas ?? 0} format="roas" loading={loading} delta={data?.roasDelta} status={(data?.blendedRoas ?? 0) >= beRoas ? 'healthy' : 'critical'} />
        <KpiCard title="Orders" value={data?.orders ?? 0} format="number" loading={loading} />
        <KpiCard title="CPA" value={data?.cpa ?? 0} format="currency" loading={loading} />
      </div>

      {/* Meta vs TikTok comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['meta', 'tiktok'] as const).map(p => {
          const stats = p === 'meta' ? data?.metaStats : data?.tiktokStats
          return (
            <Card key={p}>
              <CardHeader>
                <CardTitle className={cn('capitalize', p === 'meta' ? 'text-blue-600' : 'text-pink-600')}>{p}</CardTitle>
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
                      { label: 'CPM', value: formatCurrency(stats?.cpm ?? 0) },
                      { label: 'CPC', value: formatCurrency(stats?.cpc ?? 0) },
                      { label: 'CTR', value: `${(stats?.ctr ?? 0).toFixed(2)}%` },
                      { label: 'Conv. Rate', value: `${(stats?.convRate ?? 0).toFixed(2)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2 rounded-lg bg-slate-50">
                        <p className="text-xs text-slate-500">{label}</p>
                        <p className="font-mono font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ROAS trend with BEROAS reference line */}
      <Card>
        <CardHeader>
          <CardTitle>ROAS Trend vs Breakeven ROAS</CardTitle>
          <p className="text-sm text-slate-500">Green zone = profitable. Red zone = below breakeven.</p>
        </CardHeader>
        <CardContent>
          {loading ? <div className="skeleton h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.roasTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `${v.toFixed(2)}x` : '—'} />
                <Legend />
                <ReferenceLine y={beRoas} stroke="#EF4444" strokeDasharray="4 4" label={{ value: `BEROAS ${beRoas.toFixed(1)}x`, position: 'right', fontSize: 11, fill: '#EF4444' }} />
                <Line type="monotone" dataKey="roas" stroke="#2563EB" strokeWidth={2} dot={false} name="Blended ROAS" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Funnel */}
      {(data?.funnel ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Combined Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.funnel ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => v.toLocaleString()} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="value" fill="#2563EB" name="Count" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
