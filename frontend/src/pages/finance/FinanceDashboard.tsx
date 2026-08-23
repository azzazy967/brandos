import { useState, useEffect, useMemo } from 'react'
import { DollarSign, TrendingUp, TrendingDown, ShoppingBag, ShoppingCart, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import { KpiCard } from '@/components/shared/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface FinanceSummary {
  revenueMtd: number; revenueLastMonth: number
  expensesMtd: number; expensesLastMonth: number
  grossProfit: number; netProfit: number; marginPct: number
  codPending: number
  ordersMtd: number; ordersLastMonth: number
  revenueBreakdown: Array<{ month: string; shopify: number; pos: number; tiktok: number }>
  expenseBreakdown: Array<{ category: string; amount: number }>
  plTable: Array<{ month: string; revenue: number; expenses: number; profit: number; marginPct: number }>
}

const EXPENSE_COLORS = ['#2563EB','#F97316','#10B981','#F59E0B','#EF4444','#8B5CF6','#94A3B8']

export default function FinanceDashboard() {
  const { resolved } = useThemeStore()
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

  // AOV calculation
  const aov = data && data.ordersMtd > 0 ? data.revenueMtd / data.ordersMtd : 0
  const lastMonthAov = data && data.ordersLastMonth > 0 ? data.revenueLastMonth / data.ordersLastMonth : 0
  const aovDelta = lastMonthAov > 0 ? ((aov - lastMonthAov) / lastMonthAov) * 100 : 0

  // P&L derived data: YTD totals + forecast
  const { ytdRow, forecastRow, profitTrendData } = useMemo(() => {
    const rows = data?.plTable ?? []
    const ytd = rows.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        expenses: acc.expenses + row.expenses,
        profit: acc.profit + row.profit,
      }),
      { revenue: 0, expenses: 0, profit: 0 }
    )
    const ytdMargin = ytd.revenue > 0 ? (ytd.profit / ytd.revenue) * 100 : 0

    // Forecast: project current month to full month based on run rate
    const now = new Date()
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const runRate = dayOfMonth > 0 ? daysInMonth / dayOfMonth : 1
    const currentMonth = rows.length > 0 ? rows[rows.length - 1] : null
    let forecast = null
    if (currentMonth && dayOfMonth < daysInMonth) {
      const projRevenue = Math.round(currentMonth.revenue * runRate)
      const projExpenses = Math.round(currentMonth.expenses * runRate)
      const projProfit = projRevenue - projExpenses
      const projMargin = projRevenue > 0 ? (projProfit / projRevenue) * 100 : 0
      forecast = {
        month: `${currentMonth.month} (Forecast)`,
        revenue: projRevenue,
        expenses: projExpenses,
        profit: projProfit,
        marginPct: Math.round(projMargin * 100) / 100,
      }
    }

    // Profit trend line data from P&L rows
    const trendData = rows.map(row => ({
      month: row.month,
      profit: row.profit,
    }))

    return {
      ytdRow: { ...ytd, marginPct: Math.round(ytdMargin * 100) / 100 },
      forecastRow: forecast,
      profitTrendData: trendData,
    }
  }, [data])

  // Cash flow values
  const totalRevenue = data?.revenueMtd ?? 0
  const totalExpenses = data?.expensesMtd ?? 0
  const netCashFlow = totalRevenue - totalExpenses
  const maxCashFlow = Math.max(totalRevenue, totalExpenses, 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Finance Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Month-to-date financial summary</p>
      </div>

      {/* KPI cards — responsive: 2 -> 3 -> 4 -> 7 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard title="Revenue MTD" value={data?.revenueMtd ?? 0} format="currency" icon={DollarSign} delta={revDelta} loading={loading} status={revDelta >= 0 ? 'healthy' : 'warning'} />
        <KpiCard title="Expenses MTD" value={data?.expensesMtd ?? 0} format="currency" icon={TrendingDown} delta={expDelta} loading={loading} />
        <KpiCard title="Gross Profit" value={data?.grossProfit ?? 0} format="currency" icon={TrendingUp} loading={loading} status={(data?.grossProfit ?? 0) > 0 ? 'healthy' : 'critical'} />
        <KpiCard title="Net Profit" value={data?.netProfit ?? 0} format="currency" icon={DollarSign} loading={loading} status={(data?.netProfit ?? 0) > 0 ? 'healthy' : 'critical'} />
        <KpiCard title="Margin %" value={data?.marginPct ?? 0} format="percent" loading={loading} status={(data?.marginPct ?? 0) >= 30 ? 'healthy' : (data?.marginPct ?? 0) >= 20 ? 'warning' : 'critical'} />
        <KpiCard title="AOV" value={aov} format="currency" icon={ShoppingCart} delta={aovDelta} loading={loading} subtitle="Avg order value" status={aovDelta >= 0 ? 'healthy' : 'warning'} />
        <KpiCard title="COD Pending" value={data?.codPending ?? 0} format="currency" icon={ShoppingBag} loading={loading} status={(data?.codPending ?? 0) > 50000 ? 'critical' : 'warning'} />
      </div>

      {/* Cash Flow Summary */}
      <Card>
        <CardHeader><CardTitle>Cash Flow Summary (MTD)</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="skeleton h-24 rounded" /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Money In */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-800/40">
                    <ArrowDownLeft size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Money In</p>
                    <p className="text-xl font-bold font-mono text-green-800 dark:text-green-200">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
                {/* Money Out */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-800/40">
                    <ArrowUpRight size={20} className="text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Money Out</p>
                    <p className="text-xl font-bold font-mono text-red-800 dark:text-red-200">{formatCurrency(totalExpenses)}</p>
                  </div>
                </div>
              </div>

              {/* Bar comparison */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-12">In</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all duration-500"
                      style={{ width: `${(totalRevenue / maxCashFlow) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-12">Out</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all duration-500"
                      style={{ width: `${(totalExpenses / maxCashFlow) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Net cash flow */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Net Cash Flow</span>
                <span className={`text-lg font-bold font-mono ${netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue breakdown */}
        <Card>
          <CardHeader><CardTitle>Revenue by Channel (Monthly)</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="skeleton h-48 rounded" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.revenueBreakdown ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
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

      {/* Profit Trend Line Chart */}
      <Card>
        <CardHeader><CardTitle>Net Profit Trend</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="skeleton h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={profitTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: resolved === 'dark' ? '#1E293B' : '#FFFFFF' }}
                  activeDot={{ r: 7, fill: '#10B981' }}
                  name="Net Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* P&L table */}
      <Card>
        <CardHeader><CardTitle>Monthly P&L</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="p-6 skeleton h-32 rounded" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    {['Month', 'Revenue', 'Expenses', 'Profit', 'Margin %'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {(data?.plTable ?? []).map(row => (
                    <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium">{row.month}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(row.expenses)}</td>
                      <td className={`px-4 py-3 font-mono font-semibold ${row.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.marginPct >= 40 ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400' : row.marginPct >= 20 ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400'}`}>
                          {formatPercent(row.marginPct)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Forecast row */}
                  {forecastRow && (
                    <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-dashed border-blue-200 dark:border-blue-800">
                      <td className="px-4 py-3 font-medium text-blue-700 dark:text-blue-300 italic">{forecastRow.month}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{formatCurrency(forecastRow.revenue)}</td>
                      <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{formatCurrency(forecastRow.expenses)}</td>
                      <td className={`px-4 py-3 font-mono font-semibold ${forecastRow.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(forecastRow.profit)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${forecastRow.marginPct >= 40 ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400' : forecastRow.marginPct >= 20 ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400'}`}>
                          {formatPercent(forecastRow.marginPct)}
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* YTD totals row */}
                  <tr className="bg-slate-100 dark:bg-slate-700/60 font-semibold border-t-2 border-slate-200 dark:border-slate-600">
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">YTD Total</td>
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-100">{formatCurrency(ytdRow.revenue)}</td>
                    <td className="px-4 py-3 font-mono text-slate-900 dark:text-slate-100">{formatCurrency(ytdRow.expenses)}</td>
                    <td className={`px-4 py-3 font-mono ${ytdRow.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(ytdRow.profit)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ytdRow.marginPct >= 40 ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-400' : ytdRow.marginPct >= 20 ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400'}`}>
                        {formatPercent(ytdRow.marginPct)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
