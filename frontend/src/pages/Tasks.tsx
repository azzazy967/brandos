import { useState, useEffect, useCallback, useMemo } from 'react'
import { ListTodo, AlertTriangle, Clock, CheckCircle2, Circle, CheckCircle, Pencil, Trash2, List, Columns3, Calendar } from 'lucide-react'
import { KpiCard } from '@/components/shared/KpiCard'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatDate } from '@/lib/utils'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  module: string
  dueDate?: string
  linkedType?: string
  linkedId?: string
  completedAt?: string
  createdAt: string
}

interface TaskSummary {
  totalOpen: number
  overdue: number
  dueToday: number
  completedThisWeek: number
}

const INITIAL_FORM = { title: '', description: '', status: 'todo', priority: 'medium', module: 'general', dueDate: '', linkedType: '', linkedId: '' }

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary>({ totalOpen: 0, overdue: 0, dueToday: 0, completedThisWeek: 0 })
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [view, setView] = useState<'list' | 'board'>('list')

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.get<TaskSummary>('/tasks/summary')
      setSummary(data ?? { totalOpen: 0, overdue: 0, dueToday: 0, completedThisWeek: 0 })
    } catch { /* silent */ }
    finally { setSummaryLoading(false) }
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterPriority) params.set('priority', filterPriority)
      if (filterModule) params.set('module', filterModule)
      const data = await api.get<Task[]>(`/tasks?${params}`)
      setTasks(data ?? [])
    } catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }, [filterStatus, filterPriority, filterModule])

  useEffect(() => { fetchSummary() }, [fetchSummary])
  useEffect(() => { fetchTasks() }, [fetchTasks])

  const openCreate = () => {
    setEditingTask(null)
    setForm(INITIAL_FORM)
    setShowModal(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      module: task.module,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      linkedType: task.linkedType ?? '',
      linkedId: task.linkedId ?? '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || undefined,
        linkedType: form.linkedType || undefined,
        linkedId: form.linkedId || undefined,
        description: form.description || undefined,
      }
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, payload)
        toast.success('Task updated')
      } else {
        await api.post('/tasks', payload)
        toast.success('Task created')
      }
      setShowModal(false)
      fetchTasks()
      fetchSummary()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save task') }
    finally { setSubmitting(false) }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.put(`/tasks/${id}/complete`, {})
      fetchTasks()
      fetchSummary()
    } catch { toast.error('Failed to update task') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.del(`/tasks/${id}`)
      toast.success('Task deleted')
      fetchTasks()
      fetchSummary()
    } catch { toast.error('Failed to delete task') }
  }

  const isOverdue = (task: Task) => task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString())

  const kanbanColumns = useMemo(() => {
    const cols: { key: string; label: string; tasks: Task[] }[] = [
      { key: 'todo', label: 'To Do', tasks: [] },
      { key: 'in_progress', label: 'In Progress', tasks: [] },
      { key: 'done', label: 'Done', tasks: [] },
    ]
    for (const task of tasks) {
      const col = cols.find(c => c.key === task.status)
      if (col) col.tasks.push(task)
      else cols[0].tasks.push(task) // fallback to To Do
    }
    return cols
  }, [tasks])

  const columns: ColumnDef<Task>[] = [
    {
      key: 'complete', header: '', sortable: false,
      render: t => (
        <button onClick={e => { e.stopPropagation(); handleComplete(t.id) }} className="p-1 hover:scale-110 transition-transform">
          {t.status === 'done'
            ? <CheckCircle size={20} className="text-green-500 dark:text-green-400" />
            : <Circle size={20} className="text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400" />
          }
        </button>
      ),
    },
    {
      key: 'title', header: 'Task',
      render: t => (
        <div>
          <p className={`font-medium text-sm ${t.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{t.title}</p>
          {t.description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={t.status} /> },
    {
      key: 'priority', header: 'Priority',
      render: t => <StatusBadge status={t.priority} />,
    },
    { key: 'module', header: 'Module', render: t => <StatusBadge status={t.module} /> },
    {
      key: 'dueDate', header: 'Due Date', sortable: true,
      render: t => {
        if (!t.dueDate) return <span className="text-slate-400 dark:text-slate-500">—</span>
        const overdue = isOverdue(t)
        return (
          <div>
            <span className={overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>{formatDate(t.dueDate)}</span>
            {overdue && <p className="text-xs text-red-500 dark:text-red-400 font-semibold">Overdue</p>}
          </div>
        )
      },
    },
    {
      key: 'actions', header: '', sortable: false,
      render: t => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track and manage your operational to-dos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'list'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <List size={14} />
              List
            </button>
            <button
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'board'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Columns3 size={14} />
              Board
            </button>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <ListTodo size={16} />
            Add Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Open Tasks" value={summary.totalOpen} format="raw" icon={ListTodo} loading={summaryLoading} />
        <KpiCard title="Overdue" value={summary.overdue} format="raw" icon={AlertTriangle} loading={summaryLoading} status={summary.overdue > 0 ? 'critical' : 'healthy'} />
        <KpiCard title="Due Today" value={summary.dueToday} format="raw" icon={Clock} loading={summaryLoading} status={summary.dueToday > 0 ? 'warning' : 'healthy'} />
        <KpiCard title="Done This Week" value={summary.completedThisWeek} format="raw" icon={CheckCircle2} loading={summaryLoading} status="healthy" />
      </div>

      <div className="flex gap-3">
        <Select
          options={[{ value: '', label: 'All Statuses' }, { value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' }]}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="w-40"
          placeholder="All Statuses"
        />
        <Select
          options={[{ value: '', label: 'All Priorities' }, { value: 'urgent', label: 'Urgent' }, { value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]}
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="w-40"
          placeholder="All Priorities"
        />
        <Select
          options={[{ value: '', label: 'All Modules' }, { value: 'inventory', label: 'Inventory' }, { value: 'finance', label: 'Finance' }, { value: 'marketing', label: 'Marketing' }, { value: 'operations', label: 'Operations' }, { value: 'general', label: 'General' }]}
          value={filterModule}
          onChange={e => setFilterModule(e.target.value)}
          className="w-40"
          placeholder="All Modules"
        />
      </div>

      {view === 'list' ? (
        <DataTable
          data={tasks}
          columns={columns}
          loading={loading}
          exportFilename="tasks"
          emptyTitle="No tasks yet"
          emptyDescription="Create your first task to start tracking your to-dos."
          rowClassName={t => isOverdue(t) ? 'bg-red-50 dark:bg-red-900/10' : ''}
        />
      ) : (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ListTodo size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No tasks yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Create your first task to start tracking your to-dos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kanbanColumns.map(col => (
              <div key={col.key} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 min-h-[300px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{col.label}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {col.tasks.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
                  {col.tasks.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">No tasks</p>
                  )}
                  {col.tasks.map(task => {
                    const overdue = isOverdue(task)
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openEdit(task)}
                        className={`w-full text-left bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border transition-all hover:shadow-md hover:-translate-y-px cursor-pointer ${
                          overdue
                            ? 'border-red-300 dark:border-red-500/50'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <p className={`font-medium text-sm leading-snug ${
                          task.status === 'done'
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <StatusBadge status={task.priority} className="text-[10px] px-1.5 py-0" />
                          <StatusBadge status={task.module} className="text-[10px] px-1.5 py-0" />
                        </div>
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 mt-2 text-xs ${
                            overdue
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            <Calendar size={11} />
                            <span>{formatDate(task.dueDate)}</span>
                            {overdue && <span className="ml-1">Overdue</span>}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingTask ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Restock hoodie L"
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional details..."
              rows={2}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Status"
              options={[{ value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' }]}
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            />
            <Select
              label="Priority"
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]}
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Module"
              options={[{ value: 'general', label: 'General' }, { value: 'inventory', label: 'Inventory' }, { value: 'finance', label: 'Finance' }, { value: 'marketing', label: 'Marketing' }, { value: 'operations', label: 'Operations' }]}
              value={form.module}
              onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
            />
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-1">{editingTask ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
