import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'

interface SizeData {
  size: string; unitsSold: number; currentStock: number; sellThroughPct: number
}

interface CollectionSizes {
  collection: string; sizes: SizeData[]
}

const SIZE_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']

export default function SizeIntelligence() {
  const [collections, setCollections] = useState<CollectionSizes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<CollectionSizes[]>('/inventory/size-intelligence')
      .then(d => setCollections(d ?? []))
      .catch(() => toast.error('Failed to load size data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Size Intelligence</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Size Intelligence</h1>
        <p className="text-slate-500 text-sm mt-1">Understand which sizes sell best per collection to optimize future production runs</p>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-lg font-medium">No size data available</p>
          <p className="text-sm mt-1">Connect Shopify to see size performance data</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collections.map(col => {
            const topSize = [...col.sizes].sort((a, b) => b.sellThroughPct - a.sellThroughPct)[0]
            const worstSize = [...col.sizes].sort((a, b) => a.sellThroughPct - b.sellThroughPct)[0]
            return (
              <Card key={col.collection}>
                <CardHeader>
                  <CardTitle className="text-base">{col.collection}</CardTitle>
                  <div className="flex gap-3 text-xs mt-1">
                    {topSize && <span className="text-green-600">Top: <strong>{topSize.size}</strong> ({(topSize.sellThroughPct ?? 0).toFixed(0)}%)</span>}
                    {worstSize && <span className="text-amber-600">Slowest: <strong>{worstSize.size}</strong> ({(worstSize.sellThroughPct ?? 0).toFixed(0)}%)</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={col.sizes} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="size" tick={{ fontSize: 11 }} width={30} />
                      <Tooltip formatter={(v: unknown) => typeof v === 'number' ? `${v.toFixed(1)}%` : '—'} />
                      <Bar dataKey="sellThroughPct" name="Sell-through %" radius={[0, 4, 4, 0]}>
                        {col.sizes.map((_, i) => (
                          <Cell key={i} fill={SIZE_COLORS[i % SIZE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {col.sizes.map(s => (
                      <div key={s.size} className="text-center p-2 rounded-lg bg-slate-50">
                        <p className="text-xs font-bold text-slate-700">{s.size}</p>
                        <p className="text-xs text-green-600">{s.unitsSold} sold</p>
                        <p className="text-xs text-slate-500">{s.currentStock} left</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
