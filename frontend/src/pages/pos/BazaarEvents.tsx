import { useState, useEffect } from 'react'
import { Plus, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface BazaarEvent {
  id: string; name: string; location?: string; startDate: string
  endDate?: string; status: string; totalRevenue: number; orderCount: number
  createdAt: string
}

export default function BazaarEvents() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<BazaarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', startDate: new Date().toISOString().split('T')[0] })

  const fetchEvents = async () => {
    try {
      const data = await api.get<BazaarEvent[]>('/pos/events')
      setEvents(data ?? [])
    } catch { toast.error('Failed to load events') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEvents() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Event name is required'); return }
    setSubmitting(true)
    try {
      await api.post('/pos/events', form)
      toast.success('Event created!')
      setShowCreate(false)
      setForm({ name: '', location: '', startDate: new Date().toISOString().split('T')[0] })
      fetchEvents()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create event') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bazaar Events</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bazaar Events</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage pop-up sales events and inventory allocation</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus size={16} />
          Create Event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={48} className="text-slate-300 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">No events yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 mb-4">Create your first bazaar event to track POS sales separately</p>
          <Button onClick={() => setShowCreate(true)}>Create First Event</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <div
              key={event.id}
              onClick={() => navigate(`/pos/events/${event.id}`)}
              className={cn(
                'bg-white dark:bg-slate-800 rounded-xl p-5 border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                event.status === 'active' ? 'border-green-300 dark:border-green-700' : 'border-slate-200 dark:border-slate-700'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{event.name}</h3>
                <StatusBadge status={event.status} />
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-2">
                  <MapPin size={13} />
                  <span>{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-3">
                <Calendar size={13} />
                <span>{formatDate(event.startDate)}</span>
                {event.endDate && <span>→ {formatDate(event.endDate)}</span>}
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Revenue</p>
                  <p className="font-bold font-mono text-[#2563EB]">{formatCurrency(event.totalRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Orders</p>
                  <p className="font-bold font-mono text-slate-900 dark:text-slate-100">{event.orderCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Bazaar Event">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Event Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Cairo Shopping Festival"
            required
          />
          <Input
            label="Location (optional)"
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="e.g. City Stars Mall"
          />
          <Input
            label="Start Date"
            type="date"
            value={form.startDate}
            onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Create Event</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
