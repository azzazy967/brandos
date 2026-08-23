import { useState, useEffect, useMemo } from 'react'
import { CheckCheck, Clock, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { InsightCard } from '@/components/shared/InsightCard'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { EmptyState } from '@/components/shared/EmptyState'
import { Lightbulb } from 'lucide-react'

interface AiInsight {
  id: string; module: string; severity: 'info' | 'warning' | 'critical'
  titleEn: string; bodyEn: string; isRead: boolean; createdAt: string
}

type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older'

const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= weekAgo) return 'This Week'
  return 'Older'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return new Intl.DateTimeFormat('en-EG', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function groupAndSort(insights: AiInsight[]): { group: DateGroup; items: AiInsight[] }[] {
  const groups: Record<DateGroup, AiInsight[]> = {
    'Today': [], 'Yesterday': [], 'This Week': [], 'Older': [],
  }
  for (const insight of insights) {
    groups[getDateGroup(insight.createdAt)].push(insight)
  }
  // Sort within each group: severity first, then newest first
  for (const key of Object.keys(groups) as DateGroup[]) {
    groups[key].sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (sevDiff !== 0) return sevDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }
  const order: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Older']
  return order.map(g => ({ group: g, items: groups[g] })).filter(g => g.items.length > 0)
}

export default function Insights() {
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchInsights = async () => {
    try {
      const data = await api.get<AiInsight[]>('/insights')
      setInsights(data ?? [])
    } catch { toast.error('Failed to load insights') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInsights() }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await api.put(`/insights/${id}/read`)
      setInsights(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i))
    } catch { toast.error('Failed to mark as read') }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.put('/insights/read-all')
      setInsights(prev => prev.map(i => ({ ...i, isRead: true })))
      toast.success('All insights marked as read')
    } catch { toast.error('Failed to mark all as read') }
    finally { setMarkingAll(false) }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await api.post('/insights/generate')
      toast.success('Insight generation started — check back in a moment')
      setTimeout(fetchInsights, 3000)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to generate') }
    finally { setGenerating(false) }
  }

  const filterByModule = (module: string) =>
    module === 'all' ? insights : insights.filter(i => i.module === module)

  const unreadCount = insights.filter(i => !i.isRead).length

  // Severity counts for summary bar
  const severityCounts = useMemo(() => ({
    critical: insights.filter(i => i.severity === 'critical').length,
    warning: insights.filter(i => i.severity === 'warning').length,
    info: insights.filter(i => i.severity === 'info').length,
  }), [insights])

  // Last generated timestamp: most recent createdAt
  const lastGenerated = useMemo(() => {
    if (insights.length === 0) return null
    return insights.reduce((latest, i) =>
      new Date(i.createdAt) > new Date(latest.createdAt) ? i : latest
    ).createdAt
  }, [insights])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI Insights</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread insights` : 'All insights up to date'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Last generated timestamp */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Clock size={14} />
            <span>
              {lastGenerated
                ? `Last analysis: ${formatRelativeTime(lastGenerated)}`
                : 'Generate insights to get started'}
            </span>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllRead} loading={markingAll} className="gap-2">
                <CheckCheck size={16} />
                Mark all read
              </Button>
            )}
            <Button onClick={handleGenerate} loading={generating} variant="secondary">
              Generate Insights
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Severity summary bar */}
          {insights.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {severityCounts.critical > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
                    {severityCounts.critical} critical
                  </span>
                </div>
              )}
              {severityCounts.warning > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                    {severityCounts.warning} warning{severityCounts.warning !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {severityCounts.info > 0 && (
                <div className="flex items-center gap-1.5">
                  <Info size={14} className="text-blue-500" />
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                    {severityCounts.info} info
                  </span>
                </div>
              )}
              {severityCounts.critical === 0 && severityCounts.warning === 0 && (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  No critical or warning insights
                </span>
              )}
            </div>
          )}

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({insights.length})</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
            </TabsList>

            {['all', 'inventory', 'finance', 'marketing', 'operations'].map(tab => {
              const filtered = filterByModule(tab)
              const grouped = groupAndSort(filtered)
              return (
                <TabsContent key={tab} value={tab}>
                  {filtered.length === 0 ? (
                    <EmptyState
                      icon={Lightbulb}
                      title="No insights"
                      description="No AI insights for this category yet. Click 'Generate Insights' to analyze your data."
                    />
                  ) : (
                    <div className="space-y-5">
                      {grouped.map(({ group, items }) => (
                        <div key={group}>
                          {/* Date group header */}
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              {group}
                            </span>
                            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {items.length} insight{items.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {items.map(insight => (
                              <div key={insight.id} className="relative">
                                {/* Pulsing dot for unread critical */}
                                {!insight.isRead && insight.severity === 'critical' && (
                                  <span className="absolute -left-1.5 top-4 z-10 flex h-2.5 w-2.5">
                                    <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                                  </span>
                                )}
                                <InsightCard
                                  insight={insight}
                                  onMarkRead={insight.isRead ? undefined : handleMarkRead}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </>
      )}
    </div>
  )
}
