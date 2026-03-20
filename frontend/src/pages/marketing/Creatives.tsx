import { useState, useEffect } from 'react'
import { Image as ImageIcon, Trophy, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { BeRoasIndicator } from '@/components/shared/BeRoasIndicator'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency } from '@/lib/utils'

interface Creative {
  id: string; thumbnailUrl?: string; platform: string
  spend: number; revenue: number; roas: number; ctr: number
  beRoas: number; isWinner: boolean; isFatiguing: boolean
  ctrDropPct?: number
}

export default function Creatives() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ data: Creative[] }>('/marketing/creatives')
      .then(d => setCreatives(d.data ?? []))
      .catch(() => toast.error('Failed to load creatives'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Creatives</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Creatives</h1>
        <p className="text-slate-500 text-sm mt-1">Top 12 creative assets by performance</p>
      </div>

      {creatives.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No creatives data. Connect Windsor.ai to see creative performance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {creatives.slice(0, 12).map(creative => (
            <Card key={creative.id} className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-100">
                {creative.thumbnailUrl ? (
                  <img src={creative.thumbnailUrl} alt="Creative" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={32} className="text-slate-300" />
                  </div>
                )}
                {/* Badges overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {creative.isWinner && (
                    <span className="flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full">
                      <Trophy size={10} /> Winner
                    </span>
                  )}
                  {creative.isFatiguing && (
                    <span className="flex items-center gap-1 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Fatiguing
                    </span>
                  )}
                </div>
                <div className="absolute top-2 right-2">
                  <StatusBadge status={creative.platform} />
                </div>
              </div>

              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Spend</p>
                    <p className="font-mono font-semibold">{formatCurrency(creative.spend)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Revenue</p>
                    <p className="font-mono font-semibold">{formatCurrency(creative.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">CTR</p>
                    <p className={`font-mono font-semibold ${creative.isFatiguing ? 'text-orange-600' : 'text-slate-900'}`}>
                      {creative.ctr.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <BeRoasIndicator actualRoas={creative.roas} beRoas={creative.beRoas} />
                {creative.isFatiguing && creative.ctrDropPct && (
                  <p className="text-xs text-orange-600">CTR dropped {creative.ctrDropPct.toFixed(0)}% vs last 7d</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
