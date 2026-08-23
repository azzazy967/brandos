import { useState, useEffect, useMemo } from 'react'
import { Image as ImageIcon, X, ArrowUpDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

import { StatusBadge } from '@/components/shared/StatusBadge'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency } from '@/lib/utils'

interface Creative {
  adId: string; platform: string; creativeUrl: string | null
  spend: number; revenue: number; orders: number
  clicks: number; impressions: number; roas: number; ctr: number
}

type SortKey = 'roas' | 'spend' | 'revenue' | 'ctr'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'roas', label: 'ROAS' },
  { key: 'spend', label: 'Spend' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'ctr', label: 'CTR' },
]

/* BEROAS threshold — creatives above this are "Top Performer" */
const BEROAS_THRESHOLD = 2

export default function Creatives() {
  const [creatives, setCreatives] = useState<Creative[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('roas')
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null)

  useEffect(() => {
    api.get<Creative[]>('/marketing/creatives')
      .then(d => setCreatives(d ?? []))
      .catch(() => toast.error('Failed to load creatives'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(
    () => [...creatives].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)),
    [creatives, sortBy],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Creatives</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Creatives</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Top 12 creative assets by performance</p>
        </div>

        {/* Sorting controls */}
        {creatives.length > 0 && (
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Sort by</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {creatives.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">No creatives data. Connect Windsor.ai to see creative performance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.slice(0, 12).map(creative => (
            <Card
              key={creative.adId}
              className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
              onClick={() => setSelectedCreative(creative)}
            >
              {/* Thumbnail with hover zoom */}
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
                {creative.creativeUrl ? (
                  <img
                    src={creative.creativeUrl}
                    alt="Creative"
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={creative.platform} />
                </div>
                {/* Performance badge */}
                {creative.roas >= BEROAS_THRESHOLD && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/90 text-white">
                    Top Performer
                  </span>
                )}
                {creative.roas < 1 && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/90 text-white">
                    Below Average
                  </span>
                )}
              </div>

              <CardContent className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Spend</p>
                    <p className="font-mono font-semibold">{formatCurrency(creative.spend)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Revenue</p>
                    <p className="font-mono font-semibold">{formatCurrency(creative.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">ROAS</p>
                    <p className={`font-mono font-semibold ${creative.roas >= BEROAS_THRESHOLD ? 'text-green-600 dark:text-green-400' : creative.roas >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {(creative.roas ?? 0).toFixed(2)}x
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">CTR</p>
                    <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {(creative.ctr ?? 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox / detail modal */}
      {selectedCreative && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCreative(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedCreative(null)}
              className="absolute top-3 right-3 z-10 p-1 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Large preview */}
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-700">
              {selectedCreative.creativeUrl ? (
                <img src={selectedCreative.creativeUrl} alt="Creative" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={48} className="text-slate-300 dark:text-slate-600" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <StatusBadge status={selectedCreative.platform} />
                {selectedCreative.roas >= BEROAS_THRESHOLD && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/90 text-white">Top Performer</span>
                )}
                {selectedCreative.roas < 1 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/90 text-white">Below Average</span>
                )}
              </div>
            </div>

            {/* Full details */}
            <div className="p-5 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">Spend</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(selectedCreative.spend)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">Revenue</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(selectedCreative.revenue)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">ROAS</p>
                <p className={`font-mono font-semibold ${selectedCreative.roas >= BEROAS_THRESHOLD ? 'text-green-600 dark:text-green-400' : selectedCreative.roas >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {(selectedCreative.roas ?? 0).toFixed(2)}x
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">CTR</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{(selectedCreative.ctr ?? 0).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">Impressions</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{(selectedCreative.impressions ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mb-0.5">Clicks</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{(selectedCreative.clicks ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
