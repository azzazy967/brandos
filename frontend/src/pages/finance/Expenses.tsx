import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { useThemeStore } from '@/stores/theme-store'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Expense {
  id: string; category: string; amount: number; currency: string
  source: string; notes?: string; date: string; isRecurring: boolean
}

const CATEGORIES = ['production','packaging','shipping','ads','salary','rent','other']

export default function Expenses() {
  const { resolved } = useThemeStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ category: 'other', amount: '', notes: '', date: new Date().toISOString().split('T')[0], isRecurring: false })
  const [trend, setTrend] = useState<Array<{ month: string; amount: number }>>([])

  const fetchExpenses = async () => {
    try {
      const data = await api.get<{ data: Expense[]; trend: typeof trend }>('/finance/expenses')
      setExpenses(data.data ?? [])
      setTrend(data.trend ?? [])
    } catch { toast.error('Failed to load expenses') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchExpenses() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSubmitting(true)
    try {
      await api.post('/finance/expenses', {
        category: form.category,
        amount: Number(form.amount),
        notes: form.notes,
        date: form.date,
        isRecurring: form.isRecurring,
        source: 'manual',
        currency: 'EGP',
      })
      toast.success('Expense added')
      setShowModal(false)
      setForm({ category: 'other', amount: '', notes: '', date: new Date().toISOString().split('T')[0], isRecurring: false })
      fetchExpenses()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to add expense') }
    finally { setSubmitting(false) }
  }

  const columns: ColumnDef<Expense>[] = [
    { key: 'date', header: 'Date', sortable: true, render: e => formatDate(e.date) },
    { key: 'category', header: 'Category', render: e => <StatusBadge status={e.category} /> },
    { key: 'amount', header: 'Amount', sortable: true, render: e => <span className="font-mono font-semibold">{formatCurrency(e.amount)}</span> },
    { key: 'source', header: 'Source', render: e => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.source === 'manual' ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
        {e.source === 'manual' ? 'Manual' : 'Auto'}
      </span>
    )},
    { key: 'isRecurring', header: 'Recurring', render: e => e.isRecurring ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">Yes</span> : <span className="text-xs text-slate-400">No</span> },
    { key: 'notes', header: 'Notes', render: e => <span className="text-sm text-slate-500 dark:text-slate-400">{e.notes ?? '—'}</span> },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Expenses</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track and manage all business expenses</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus size={16} />
          Add Expense
        </Button>
      </div>

      {trend.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Monthly Expense Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={resolved === 'dark' ? '#334155' : '#F1F5F9'} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#2563EB" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <DataTable
        data={expenses}
        columns={columns}
        loading={loading}
        exportFilename="expenses"
        emptyTitle="No expenses recorded"
        emptyDescription="Add your first expense or connect integrations to auto-import."
        action={{ label: 'Add Expense', onClick: () => setShowModal(true) }}
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Category"
            options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          />
          <Input label="Amount (EGP)" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min="0" step="0.01" />
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. July rent payment" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Recurring (auto-creates monthly)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">Save Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
