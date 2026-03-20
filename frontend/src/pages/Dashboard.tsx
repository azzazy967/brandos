import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ShoppingBag, TrendingUp, Truck, BarChart3, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { InsightCard } from '@/components/shared/InsightCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
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
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<FinanceSummary>('/finance/summary'),
      api.get<{ data: AiInsight[] }>('/insights?unread=true&limit=3'),
      api.get<{ data: RecentOrder[] }>('/operations/orders?limit=10'),
      api.get<DashboardStats>('/dashboard/stats'),
    ]).then(([fin, ins, orders, st]) => {
      setFinance(fin)
      setInsights(ins.data ?? [])
      setRecentOrders(orders.data ?? [])
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{formatDate(new Date())}</p>
      </div>

      {/* Critical alerts */}
      {insights.filter(i => !i.isRead && (i.severity === 'critical' || i.severity === 'warning')).length > 0 && (
        <div className="space-y-2">
          {insights.filter(i => !i.isRead && (i.severity === 'critical' || i.severity === 'warning')).map(insight => (
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

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Revenue MTD" value={finance?.revenueMtd ?? 0} format="currency" icon={DollarSign} delta={deltaRevenue} loading={loading} status={deltaRevenue >= 0 ? 'healthy' : 'warning'} />
        <KpiCard title="Orders MTD" value={finance?.ordersMtd ?? 0} format="number" icon={ShoppingBag} loading={loading} />
        <KpiCard title="Profit Margin" value={finance?.marginPct ?? 0} format="percent" icon={TrendingUp} loading={loading} status={(finance?.marginPct ?? 0) >= 30 ? 'healthy' : (finance?.marginPct ?? 0) >= 20 ? 'warning' : 'critical'} />
        <KpiCard title="COD Pending" value={finance?.codPending ?? 0} format="currency" icon={DollarSign} loading={loading} status={(finance?.codPending ?? 0) > 50000 ? 'critical' : 'warning'} />
        <KpiCard title="Blended ROAS" value={finance?.blendedRoas ?? 0} format="roas" icon={BarChart3} loading={loading} status={(finance?.blendedRoas ?? 0) >= (finance?.beRoas ?? 2) ? 'healthy' : 'critical'} />
        <KpiCard title="BEROAS" value={finance?.beRoas ?? 0} format="roas" loading={loading} subtitle="Breakeven target" />
      </div>

      {/* Revenue chart + quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Ad Spend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="skeleton h-48 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={finance?.revenueTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} dot={false} name="Revenue" />
                  <Bar dataKey="adSpend" fill="#F97316" opacity={0.6} name="Ad Spend" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick stats bento */}
        <div className="space-y-4">
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/inventory')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50"><AlertTriangle size={18} className="text-amber-500" /></div>
              <div>
                <p className="text-xs text-slate-500">Inventory Alerts</p>
                <p className="font-semibold text-slate-900">{stats?.lowStockCount ?? '—'} low · {stats?.outOfStockCount ?? '—'} out</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/operations')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50"><Truck size={18} className="text-blue-500" /></div>
              <div>
                <p className="text-xs text-slate-500">Operations</p>
                <p className="font-semibold text-slate-900">{stats?.inTransitCount ?? '—'} in transit · {stats?.failedCount ?? '—'} failed</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/marketing')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F97316]/10"><BarChart3 size={18} className="text-[#F97316]" /></div>
              <div>
                <p className="text-xs text-slate-500">ROAS Status</p>
                <StatusBadge status={stats?.roasStatus ?? 'neutral'} />
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5" onClick={() => navigate('/finance/cod')}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50"><DollarSign size={18} className="text-green-500" /></div>
              <div>
                <p className="text-xs text-slate-500">COD Uncollected</p>
                <p className="font-semibold text-slate-900">{formatCurrency(stats?.codUncollected ?? 0)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-10 rounded" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Order', 'Source', 'Customer', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{order.orderNumber ?? order.id.slice(0,8)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.source} /></td>
                      <td className="px-4 py-3 text-slate-700">{order.customerName ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.paymentMethod} /></td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(order.createdAt)}</td>
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
