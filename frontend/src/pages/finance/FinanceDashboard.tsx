import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface FinanceSummary {
  revenueMtd: number; revenueLastMonth: number
  expensesMtd: number; expensesLastMonth: number
  grossProfit: number; netProfit: number; marginPct: number
  codPending: number
  revenueBreakdown: Array<{ month: string; shopify: number; pos: number; tiktok: number }>
  expenseBreakdown: Array<{ category: string; amount: number }>
  plTable: Array<{ month: string; revenue: number; expenses: number; profit: number; marginPct: number }>
}

const EXPENSE_COLORS = ['#2563EB','#F97316','#10B981','#F59E0B','#EF4444','#8B5CF6','#94A3B8']

export default function FinanceDashboard() {
  const [data, setData] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<FinanceSummary>('/finance/summary')
      .then(setData)
      .catch(() => toast.error('Failed to load finance data'))
      .finally(() => setLoading(false))
  }, [])

  const revDelta = data ? ((data.revenueMtd - data.revenueLastMonth) / Math.max(data.revenueLastMonth, 1)) * 100 : 0
  const expDelta = data ? ((data.expensesMtd - data.expensesLastMonth) / Math.max(data.expensesLastMonth, 1)) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Month-to-date financial summary</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Revenue MTD" value={data?.revenueMtd ?? 0} format="currency" icon={DollarSign} delta={revDelta} loading={loading} status={revDelta >= 0 ? 'healthy' : 'warning'} />
        <KpiCard title="Expenses MTD" value={data?.expensesMtd ?? 0} format="currency" icon={TrendingDown} delta={expDelta} loading={loading} />
        <KpiCard title="Gross Profit" value={data?.grossProfit ?? 0} format="currency" icon={TrendingUp} loading={loading} status={(data?.grossProfit ?? 0) > 0 ? 'healthy' : 'critical'} />
        <KpiCard title="Net Profit" value={data?.netProfit ?? 0} format="currency" icon={DollarSign} loading={loading} status={(data?.netProfit ?? 0) > 0 ? 'healthy' : 'critical'} />
        <KpiCard title="Margin %" value={data?.marginPct ?? 0} format="percent" loading={loading} status={(data?.marginPct ?? 0) >= 30 ? 'healthy' : (data?.marginPct ?? 0) >= 20 ? 'warning' : 'critical'} />
        <KpiCard title="COD Pending" value={data?.codPending ?? 0} format="currency" icon={ShoppingBag} loading={loading} status={(data?.codPending ?? 0) > 50000 ? 'critical' : 'warning'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue breakdown */}
        <Card>
          <CardHeader><CardTitle>Revenue by Channel (Monthly)</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="skeleton h-48 rounded" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.revenueBreakdown ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="shopify" fill="#2563EB" name="Shopify" stackId="a" />
                  <Bar dataKey="pos" fill="#F97316" name="POS/Bazaar" stackId="a" />
                  <Bar dataKey="tiktok" fill="#10B981" name="TikTok Shop" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Expense donut */}
        <Card>
          <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="skeleton h-48 rounded" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data?.expenseBreakdown ?? []}
                    dataKey="amount"
                    nameKey="category"
                    cx="40%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(data?.expenseBreakdown ?? []).map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L table */}
      <Card>
        <CardHeader><CardTitle>Monthly P&L</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-6 skeleton h-32 rounded" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Month', 'Revenue', 'Expenses', 'Profit', 'Margin %'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.plTable ?? []).map(row => (
                    <tr key={row.month} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{row.month}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(row.expenses)}</td>
                      <td className={`px-4 py-3 font-mono font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.marginPct >= 40 ? 'bg-green-100 text-green-700' : row.marginPct >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {formatPercent(row.marginPct)}
                        </span>
                      </td>
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
