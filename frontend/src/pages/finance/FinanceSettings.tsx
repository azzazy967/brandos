import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { calculateOverheadPerUnit } from '@/lib/beroas'

interface OverheadSettings {
  monthlyRent: number; monthlySalaries: number; otherMonthly: number; avgShippingCost: number
}

export default function FinanceSettings() {
  const [settings, setSettings] = useState<OverheadSettings>({ monthlyRent: 0, monthlySalaries: 0, otherMonthly: 0, avgShippingCost: 50 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [unitsSold, setUnitsSold] = useState('100')

  useEffect(() => {
    api.get<OverheadSettings>('/settings/overhead')
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/settings/overhead', settings)
      toast.success('Overhead settings saved')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const update = (field: keyof OverheadSettings, value: string) => {
    setSettings(s => ({ ...s, [field]: Number(value) || 0 }))
  }

  const overheadPerUnit = calculateOverheadPerUnit({
    monthlyRent: settings.monthlyRent,
    monthlySalaries: settings.monthlySalaries,
    otherMonthly: settings.otherMonthly,
    unitsSoldThisMonth: Number(unitsSold) || 1,
  })

  const totalMonthly = settings.monthlyRent + settings.monthlySalaries + settings.otherMonthly

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure overhead costs that feed the BEROAS engine</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overhead Configuration</CardTitle>
          <CardDescription>These values are used to calculate your breakeven ROAS across all marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {loading ? (
              <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded" />)}</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Monthly Rent (EGP)" type="number" value={settings.monthlyRent} onChange={e => update('monthlyRent', e.target.value)} min="0" />
                  <Input label="Monthly Salaries (EGP)" type="number" value={settings.monthlySalaries} onChange={e => update('monthlySalaries', e.target.value)} min="0" />
                  <Input label="Other Monthly Fixed (EGP)" type="number" value={settings.otherMonthly} onChange={e => update('otherMonthly', e.target.value)} min="0" />
                  <Input label="Avg Shipping Cost (EGP)" type="number" value={settings.avgShippingCost} onChange={e => update('avgShippingCost', e.target.value)} min="0" step="0.01" />
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <p className="text-sm font-semibold text-blue-800">BEROAS Preview</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600">Total Monthly Overhead</p>
                      <p className="font-mono font-bold text-blue-900">EGP {totalMonthly.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-blue-600 block">Units Sold This Month</label>
                      <input
                        type="number"
                        value={unitsSold}
                        onChange={e => setUnitsSold(e.target.value)}
                        className="w-full mt-1 h-8 px-2 rounded border border-blue-300 text-sm focus:outline-none focus:border-blue-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <p className="text-blue-600">Overhead per Unit</p>
                      <p className="font-mono font-bold text-blue-900">EGP {overheadPerUnit.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

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
