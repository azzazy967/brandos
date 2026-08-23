import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  DollarSign, ShoppingBag, TrendingUp, Truck, BarChart3, AlertTriangle,
  ShoppingCart, Package, Receipt, Store, ArrowRight,
} from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { InsightCard } from '@/components/shared/InsightCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency, formatDate } from '@/lib/utils'

interface FinanceSummary {
  revenueMtd: number; revenueLastMonth: number
  ordersMtd: number; ordersLastMonth: number
  marginPct: number; marginLastMonth: number
  codPending: number
  blendedRoas: number
  beRoas: number
  revenueTrend: Array<{ date: string; revenue: number; adSpend: number }>
}

interface AiInsight {
  id: string; module: string; severity: 'info' | 'warning' | 'critical'
  titleEn: string; bodyEn: string; isRead: boolean; createdAt: string
}

interface RecentOrder {
  id: string; orderNumber?: string; source: string
  customerName?: string; totalAmount: number
  status: string; paymentMethod: string; createdAt: string
}

interface DashboardStats {
  lowStockCount: number; outOfStockCount: number
  inTransitCount: number; failedCount: number
  codUncollected: number
  roasStatus: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { resolved } = useThemeStore()
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<FinanceSummary>('/finance/summary'),
      api.get<AiInsight[]>('/insights?unread=true&limit=3'),
      api.get<RecentOrder[]>('/operations/orders?limit=10'),
      api.get<DashboardStats>('/dashboard/stats'),
    ]).then(([fin, ins, orders, st]) => {
      setFinance(fin)
      setInsights(ins ?? [])
      setRecentOrders(orders ?? [])
      setStats(st)
    }).catch(() => toast.error('Failed to load dashboard')).finally(() => setLoading(false))
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await api.put(`/insights/${id}/read`)
      setInsights(prev => prev.filter(i => i.id !== id))
    } catch { toast.error('Failed to mark as read') }
  }

  const deltaRevenue = finance
    ? ((finance.revenueMtd - finance.revenueLastMonth) / Math.max(finance.revenueLastMonth, 1)) * 100
    : 0

  /* Derive "today" snapshot from the last day in the revenue trend */
  const todayData = finance?.revenueTrend?.length
    ? finance.revenueTrend[finance.revenueTrend.length - 1]
    : null

  /* Critical/warning insights (computed once, not re-filtered in JSX) */
  const alertInsights = useMemo(
    () => insights.filter(i => !i.isRead && (i.severity === 'critical' || i.severity === 'warning')),
    [insights],
  )

  /* Limit recent orders to 5 for the dashboard view */
  const visibleOrders = recentOrders.slice(0, 5)

  /* ── Dashboard skeleton for loading state ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{formatDate(new Date())}</p>
        </div>

        {/* Today's snapshot skeleton */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
          <div className="skeleton-shimmer h-4 w-12 rounded" />
          <div className="skeleton-shimmer h-4 w-24 rounded" />
          <div className="skeleton-shimmer h-4 w-28 rounded" />
          <div className="skeleton-shimmer h-4 w-24 rounded" />
        </div>

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 border-l-4 border-l-slate-200 dark:border-l-slate-600">
              <div className="flex items-start justify-between">
                <div className="skeleton-shimmer h-3 w-20 rounded" />
                <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
              </div>
              <div className="skeleton-shimmer h-7 w-28 rounded mt-3" />
              <div className="skeleton-shimmer h-3 w-16 rounded mt-2" />
            </div>
          ))}
        </div>

        {/* Chart + quick stats skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <div className="skeleton-shimmer h-5 w-48 rounded mb-4" />
            <div className="skeleton-shimmer h-[200px] lg:h-[280px] w-full rounded" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton-shimmer h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton-shimmer h-3 w-20 rounded" />
                    <div className="skeleton-shimmer h-4 w-32 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-10 w-36 rounded-lg" />
          ))}
        </div>

        {/* Recent orders table skeleton */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="skeleton-shimmer h-5 w-32 rounded" />
            <div className="skeleton-shimmer h-4 w-24 rounded" />
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-3 rounded flex-1" />
            ))}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {Array.from({ length: 5 }).map((_, r) => (
              <div key={r} className="px-4 py-3 flex gap-4">
                {Array.from({ length: 7 }).map((_, c) => (
                  <div key={c} className="skeleton-shimmer h-4 rounded flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{formatDate(new Date())}</p>
      </div>

      {/* Critical alerts */}
      {alertInsights.length > 0 && (
        <div className="space-y-2">
          {alertInsights.map(insight => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onMarkRead={handleMarkRead}
              onDismiss={handleMarkRead}
              compact
            />
          ))}
        </div>
      )}

      {/* ─── Today's snapshot row ─── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="font-medium text-slate-800 dark:text-slate-100">Today</span>
        <span>Orders: <strong className="font-semibold">{finance?.ordersMtd ?? 0}</strong></span>
        <span>Revenue: <strong className="font-semibold">{formatCurrency(todayData?.revenue ?? finance?.revenueMtd ?? 0)}</strong></span>
        <span>Ad spend: <strong className="font-semibold">{formatCurrency(todayData?.adSpend ?? 0)}</strong></span>
      </div>

      {/* ─── KPI row (responsive: 2→3→6 cols) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {(
          [
            <KpiCard key="rev" title="Revenue MTD" value={finance?.revenueMtd ?? 0} format="currency" icon={DollarSign} delta={deltaRevenue} loading={loading} status={deltaRevenue >= 0 ? 'healthy' : 'warning'} />,
            <KpiCard key="ord" title="Orders MTD" value={finance?.ordersMtd ?? 0} format="number" icon={ShoppingBag} loading={loading} />,
            <KpiCard key="margin" title="Profit Margin" value={finance?.marginPct ?? 0} format="percent" icon={TrendingUp} loading={loading} status={(finance?.marginPct ?? 0) >= 30 ? 'healthy' : (finance?.marginPct ?? 0) >= 20 ? 'warning' : 'critical'} />,
            <KpiCard key="cod" title="COD Pending" value={finance?.codPending ?? 0} format="currency" icon={DollarSign} loading={loading} status={(finance?.codPending ?? 0) > 50000 ? 'critical' : 'warning'} />,
            <KpiCard key="roas" title="Blended ROAS" value={finance?.blendedRoas ?? 0} format="roas" icon={BarChart3} loading={loading} status={(finance?.blendedRoas ?? 0) >= (finance?.beRoas ?? 2) ? 'healthy' : 'critical'} />,
            <KpiCard key="beroas" title="BEROAS" value={finance?.beRoas ?? 0} format="roas" loading={loading} subtitle="Breakeven target" />,
          ] as React.ReactElement[]
        ).map((card, idx) => (
          <div
            key={idx}
            className="animate-fade-in-up"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {card}
          </div>
        ))}
      </div>

      {/* ─── Revenue chart + quick stats ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Ad Spend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] lg:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={finance?.revenueTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="adSpend" fill="#F97316" opacity={0.6} name="Ad Spend" />
                  <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} name="Revenue" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats bento */}
        <div className="space-y-4">
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/inventory')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30"><AlertTriangle size={18} className="text-amber-500" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inventory Alerts</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{stats?.lowStockCount ?? '—'} low · {stats?.outOfStockCount ?? '—'} out</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/operations')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30"><Truck size={18} className="text-blue-500" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Operations</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{stats?.inTransitCount ?? '—'} in transit · {stats?.failedCount ?? '—'} failed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/marketing')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F97316]/10"><BarChart3 size={18} className="text-[#F97316]" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">ROAS Status</p>
                <StatusBadge status={stats?.roasStatus ?? 'neutral'} />
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/finance/cod')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30"><DollarSign size={18} className="text-green-500" /></div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">COD Uncollected</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(stats?.codUncollected ?? 0)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="flex flex-wrap gap-3">
        {([
          { to: '/operations/orders', label: 'View All Orders', icon: ShoppingCart },
          { to: '/inventory',         label: 'Check Inventory', icon: Package },
          { to: '/finance/expenses',  label: 'Add Expense',     icon: Receipt },
          { to: '/pos',               label: 'Create POS Sale', icon: Store },
        ] as const).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <Icon size={16} className="text-slate-400 dark:text-slate-500" />
            {label}
          </Link>
        ))}
      </div>

      {/* ─── Recent orders ─── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link
            to="/operations/orders"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            View all orders <ArrowRight size={14} />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {visibleOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Payment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {visibleOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{order.orderNumber ?? order.id.slice(0,8)}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={order.source} /></td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{order.customerName ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={order.paymentMethod} /></td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden md:table-cell">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
