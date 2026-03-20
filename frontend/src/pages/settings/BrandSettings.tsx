import { useState, useEffect } from 'react'
import { Save, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'

interface BrandSettings {
  name: string; email: string; currency: string
  language: string; lowStockThreshold: number; logoUrl?: string
}

export default function BrandSettings() {
  const [settings, setSettings] = useState<BrandSettings>({
    name: '', email: '', currency: 'EGP', language: 'en', lowStockThreshold: 10
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<BrandSettings>('/brand')
      .then(setSettings)
      .catch(() => toast.error('Failed to load brand settings'))
      .finally(() => setLoading(false))
  }, [])

  const update = (field: keyof BrandSettings, value: string | number) => {
    setSettings(s => ({ ...s, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings.name.trim()) { toast.error('Brand name is required'); return }
    setSaving(true)
    try {
      await api.put('/brand', settings)
      toast.success('Brand settings saved!')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Brand Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your brand profile and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Brand Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {loading ? (
              <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-10 rounded" />)}</div>
            ) : (
              <>
                {/* Logo */}
                {settings.logoUrl && (
                  <div className="flex items-center gap-4">
                    <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-contain border border-slate-200" />
                    <Button type="button" variant="outline" size="sm" className="gap-2">
                      <Upload size={14} />
                      Change Logo
                    </Button>
                  </div>
                )}

                <Input
                  label="Brand Name"
                  value={settings.name}
                  onChange={e => update('name', e.target.value)}
                  placeholder="Your Brand Name"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  value={settings.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="brand@example.com"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Currency"
                    options={[
                      { value: 'EGP', label: 'EGP — Egyptian Pound' },
                      { value: 'USD', label: 'USD — US Dollar' },
                    ]}
                    value={settings.currency}
                    onChange={e => update('currency', e.target.value)}
                  />

                  <Select
                    label="Language"
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'ar', label: 'العربية' },
                    ]}
                    value={settings.language}
                    onChange={e => update('language', e.target.value)}
                  />
                </div>

                <Input
                  label="Low Stock Threshold (units)"
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={e => update('lowStockThreshold', Number(e.target.value))}
                  min="1"
                  max="1000"
                />

                <Button type="submit" loading={saving} className="gap-2">
                  <Save size={16} />
                  Save Settings
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
