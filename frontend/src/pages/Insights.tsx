import { useState, useEffect } from 'react'
import { CheckCheck } from 'lucide-react'
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

export default function Insights() {
  const [insights, setInsights] = useState<AiInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [generating, setGenerating] = useState(false)

  const fetchInsights = async () => {
    try {
      const data = await api.get<{ data: AiInsight[] }>('/insights')
      setInsights(data.data ?? [])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Insights</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread insights` : 'All insights up to date'}
          </p>
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

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : (
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
            return (
              <TabsContent key={tab} value={tab}>
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Lightbulb}
                    title="No insights"
                    description="No AI insights for this category yet. Click 'Generate Insights' to analyze your data."
                  />
                ) : (
                  <div className="space-y-3">
                    {/* Critical first */}
                    {filtered.filter(i => i.severity === 'critical' && !i.isRead).map(insight => (
                      <InsightCard key={insight.id} insight={insight} onMarkRead={handleMarkRead} />
                    ))}
                    {filtered.filter(i => i.severity === 'warning' && !i.isRead).map(insight => (
                      <InsightCard key={insight.id} insight={insight} onMarkRead={handleMarkRead} />
                    ))}
                    {filtered.filter(i => i.severity === 'info' && !i.isRead).map(insight => (
                      <InsightCard key={insight.id} insight={insight} onMarkRead={handleMarkRead} />
                    ))}
                    {/* Read insights */}
                    {filtered.filter(i => i.isRead).length > 0 && (
                      <div className="opacity-60 space-y-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Read</p>
                        {filtered.filter(i => i.isRead).map(insight => (
                          <InsightCard key={insight.id} insight={insight} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}
