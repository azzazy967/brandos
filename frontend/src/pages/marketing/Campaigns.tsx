import { useState, useEffect } from 'react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BeRoasIndicator } from '@/components/shared/BeRoasIndicator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency } from '@/lib/utils'

interface Campaign {
  id: string; name: string; platform: string; status: string
  spend: number; revenue: number; roas: number; orders: number
  cpa: number; beRoas: number; roasGap: number
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Campaign[]>('/marketing/campaigns')
      .then(d => setCampaigns(d ?? []))
      .catch(() => toast.error('Failed to load campaigns'))
      .finally(() => setLoading(false))
  }, [])

  const columns: ColumnDef<Campaign>[] = [
    { key: 'name', header: 'Campaign', render: c => <p className="font-medium text-sm max-w-xs truncate">{c.name}</p> },
    { key: 'platform', header: 'Platform', render: c => <StatusBadge status={c.platform} /> },
    { key: 'status', header: 'Status', render: c => <StatusBadge status={c.status} /> },
    { key: 'spend', header: 'Spend', sortable: true, render: c => <span className="font-mono">{formatCurrency(c.spend)}</span> },
    { key: 'revenue', header: 'Revenue', sortable: true, render: c => <span className="font-mono">{formatCurrency(c.revenue)}</span> },
    { key: 'roas', header: 'ROAS', sortable: true, render: c => <BeRoasIndicator actualRoas={c.roas} beRoas={c.beRoas} showDetails={false} /> },
    { key: 'orders', header: 'Orders', sortable: true, render: c => <span className="font-mono">{c.orders}</span> },
    { key: 'cpa', header: 'CPA', sortable: true, render: c => <span className="font-mono">{formatCurrency(c.cpa)}</span> },
    {
      key: 'roasGap', header: 'BEROAS Gap', sortable: true,
      render: c => (
        <span className={`font-mono font-semibold text-sm ${c.roasGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {c.roasGap >= 0 ? '+' : ''}{c.roasGap.toFixed(2)}x
        </span>
      )
    },
  ]

  const filterByPlatform = (plat: string) =>
    plat === 'all' ? campaigns : campaigns.filter(c => c.platform === plat)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
        <p className="text-slate-500 text-sm mt-1">Campaign performance with BEROAS gap analysis</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="meta">Meta</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
        </TabsList>

        {['all','meta','tiktok'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <DataTable
              data={filterByPlatform(tab)}
              columns={columns}
              loading={loading}
              exportFilename={`campaigns-${tab}`}
              emptyTitle="No campaigns found"
              emptyDescription="Connect Windsor.ai to see campaign data."
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
