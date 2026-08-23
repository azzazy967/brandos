import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, X as CloseIcon, Printer, MapPin, Calendar, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDate } from '@/lib/utils'

interface EventSummary {
  id: string; name: string; location?: string; status: string
  startDate: string; endDate?: string
  totalRevenue: number; orderCount: number
  inventory: Array<{
    productId: string; title: string; sku: string; size?: string; color?: string
    allocated: number; sold: number; returned: number; leftover: number
  }>
  topSellers: Array<{ title: string; sku: string; sold: number; revenue: number }>
  paymentBreakdown: Array<{ method: string; count: number; amount: number }>
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<EventSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get<EventSummary>(`/pos/events/${id}/summary`)
      .then(setEvent)
      .catch(() => toast.error('Failed to load event'))
      .finally(() => setLoading(false))
  }, [id])

  const handleClose = async () => {
    if (!confirm('Close this event? Unsold stock will be returned to warehouse.')) return
    setClosing(true)
    try {
      const updated = await api.put<EventSummary>(`/pos/events/${id}/close`)
      setEvent(updated)
      toast.success('Event closed and inventory returned to warehouse')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to close event') }
    finally { setClosing(false) }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    )
  }

  if (!event) return <div className="text-center py-16 text-slate-500 dark:text-slate-400">Event not found</div>

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Link to="/pos" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          POS
        </Link>
        <ChevronRight size={14} className="shrink-0" />
        <Link to="/pos/events" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          Events
        </Link>
        <ChevronRight size={14} className="shrink-0" />
        <span className="text-slate-900 dark:text-slate-100 font-medium truncate">{event.name}</span>
      </nav>

      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pos/events')}>
          <ArrowLeft size={18} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{event.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StatusBadge status={event.status} />
            {event.location && (
              <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <MapPin size={13} />
                {event.location}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <Calendar size={13} />
              {formatDate(event.startDate)}
              {event.endDate && ` → ${formatDate(event.endDate)}`}
            </span>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer size={16} />
            Print Report
          </Button>
          {event.status === 'active' && (
            <Button variant="destructive" onClick={handleClose} loading={closing} className="gap-2">
              <CloseIcon size={16} />
              Close Event
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Revenue</p>
          <p className="text-2xl font-bold font-mono text-[#2563EB]">{formatCurrency(event.totalRevenue)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Orders</p>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{event.orderCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Items Allocated</p>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{event.inventory.reduce((s, i) => s + i.allocated, 0)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Items Sold</p>
          <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">{event.inventory.reduce((s, i) => s + i.sold, 0)}</p>
        </Card>
      </div>

      {/* Top sellers + payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {event.topSellers.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Top Sellers</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.topSellers.slice(0, 5).map((item, idx) => (
                  <div key={item.sku} className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{item.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono">{formatCurrency(item.revenue)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.sold} units</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {event.paymentBreakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Payment Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.paymentBreakdown.map(p => (
                  <div key={p.method} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{p.method}</span>
                    <div className="text-right">
                      <p className="font-mono font-bold">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{p.count} transactions</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Inventory breakdown */}
      <Card>
        <CardHeader><CardTitle>Inventory Reconciliation</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  {['Product', 'SKU', 'Allocated', 'Sold', 'Returned', 'Leftover'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {event.inventory.map(item => (
                  <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.title}</p>
                      {(item.size || item.color) && <p className="text-xs text-slate-400 dark:text-slate-500">{[item.size, item.color].filter(Boolean).join(' · ')}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3 font-mono">{item.allocated}</td>
                    <td className="px-4 py-3 font-mono text-green-600 dark:text-green-400 font-semibold">{item.sold}</td>
                    <td className="px-4 py-3 font-mono">{item.returned}</td>
                    <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">{item.leftover}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
