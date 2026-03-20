import { useState, useEffect } from 'react'
import { Store, BarChart3, Truck, Package, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatDateTime } from '@/lib/utils'

interface Integration {
  id: string; type: string; status: string; lastSyncedAt?: string
}

interface IntegrationConfig {
  key: string; label: string; description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  fields: Array<{ key: string; label: string; type?: string; placeholder?: string }>
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    key: 'shopify', label: 'Shopify', icon: Store,
    description: 'Sync products, inventory, and orders from your Shopify store',
    fields: [{ key: 'shopUrl', label: 'Store URL', placeholder: 'yourstore.myshopify.com' }],
  },
  {
    key: 'windsor', label: 'Windsor.ai', icon: BarChart3,
    description: 'Unify Meta and TikTok advertising data into one dashboard',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'wai_xxxxxxxxxxxxxxxx' }],
  },
  {
    key: 'aramex', label: 'Aramex', icon: Truck,
    description: 'Track shipments and COD collection via Aramex',
    fields: [
      { key: 'username', label: 'Username', placeholder: 'aramex@yourbrand.com' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
      { key: 'accountNumber', label: 'Account Number', placeholder: '12345678' },
      { key: 'accountPin', label: 'Account PIN', type: 'password', placeholder: '••••' },
    ],
  },
  {
    key: 'bosta', label: 'Bosta', icon: Package,
    description: 'Track shipments and COD collection via Bosta',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'bosta_xxxxxxxx' }],
  },
]

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [_loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)

  const fetchIntegrations = async () => {
    try {
      const data = await api.get<Integration[]>('/settings/integrations')
      setIntegrations(data ?? [])
    } catch { toast.error('Failed to load integrations') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchIntegrations() }, [])

  const getIntegration = (type: string) => integrations.find(i => i.type === type)

  const handleConnect = async (type: string) => {
    setSubmitting(true)
    try {
      await api.post(`/settings/integrations/${type}`, formData)
      toast.success(`${type} connected successfully!`)
      setActiveModal(null)
      setFormData({})
      fetchIntegrations()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Connection failed') }
    finally { setSubmitting(false) }
  }

  const handleDisconnect = async (type: string) => {
    if (!confirm(`Disconnect ${type}? This will stop syncing data.`)) return
    try {
      await api.del(`/settings/integrations/${type}`)
      toast.success(`${type} disconnected`)
      fetchIntegrations()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Disconnect failed') }
  }

  const handleSync = async (type: string) => {
    setSyncing(type)
    try {
      await api.post(`/sync/${type}`)
      toast.success(`${type} sync started`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Sync failed') }
    finally { setSyncing(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500 text-sm mt-1">Connect your data sources to power Brand OS analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map(config => {
          const integration = getIntegration(config.key)
          const isConnected = integration?.status === 'connected'
          const hasError = integration?.status === 'error'

          return (
            <Card key={config.key} className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-50 shrink-0">
                  <config.icon size={24} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{config.label}</h3>
                    {isConnected && <CheckCircle size={16} className="text-green-500" />}
                    {hasError && <XCircle size={16} className="text-red-500" />}
                    {!integration && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Not connected</span>}
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{config.description}</p>
                  {integration?.lastSyncedAt && (
                    <p className="text-xs text-slate-400 mb-3">Last sync: {formatDateTime(integration.lastSyncedAt)}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {isConnected ? (
                      <>
                        <Button
                          variant="outline" size="sm"
                          loading={syncing === config.key}
                          onClick={() => handleSync(config.key)}
                          className="gap-1.5"
                        >
                          <RefreshCw size={13} />
                          Sync Now
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDisconnect(config.key)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => { setActiveModal(config.key); setFormData({}) }}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Connect modals */}
      {INTEGRATIONS.map(config => (
        <Modal
          key={config.key}
          open={activeModal === config.key}
          onClose={() => setActiveModal(null)}
          title={`Connect ${config.label}`}
        >
          <div className="space-y-4">
            {config.fields.map(field => (
              <Input
                key={field.key}
                label={field.label}
                type={field.type ?? 'text'}
                value={formData[field.key] ?? ''}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
            ))}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveModal(null)} className="flex-1">Cancel</Button>
              <Button loading={submitting} onClick={() => handleConnect(config.key)} className="flex-1">Connect</Button>
            </div>
          </div>
        </Modal>
      ))}
    </div>
  )
}
