import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, Store, BarChart3, Truck, Package, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, title: 'Connect Shopify', icon: Store, description: 'Sync your products and orders' },
  { id: 2, title: 'Connect Windsor.ai', icon: BarChart3, description: 'Unify Meta + TikTok data' },
  { id: 3, title: 'Connect Couriers', icon: Truck, description: 'Aramex and/or Bosta' },
  { id: 4, title: 'Enter COGS', icon: Package, description: 'Cost of goods sold per product' },
  { id: 5, title: 'Overhead Settings', icon: DollarSign, description: 'Fixed monthly costs' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step forms state
  const [shopifyUrl, setShopifyUrl] = useState('')
  const [windsorKey, setWindsorKey] = useState('')
  const [aramex, setAramex] = useState({ username: '', password: '', accountNumber: '', accountPin: '' })
  const [bostaKey, setBostaKey] = useState('')
  const [overhead, setOverhead] = useState({ monthlyRent: '', monthlySalaries: '', otherMonthly: '', avgShippingCost: '' })

  const submitStep = async () => {
    setLoading(true)
    try {
      if (step === 1 && shopifyUrl) {
        await api.post('/settings/integrations/shopify', { shopUrl: shopifyUrl })
        toast.success('Shopify connected!')
      } else if (step === 2 && windsorKey) {
        await api.post('/settings/integrations/windsor', { apiKey: windsorKey })
        toast.success('Windsor.ai connected!')
      } else if (step === 3) {
        if (aramex.username) {
          await api.post('/settings/integrations/aramex', aramex)
          toast.success('Aramex connected!')
        }
        if (bostaKey) {
          await api.post('/settings/integrations/bosta', { apiKey: bostaKey })
          toast.success('Bosta connected!')
        }
      } else if (step === 5) {
        await api.put('/settings/overhead', {
          monthlyRent: Number(overhead.monthlyRent) || 0,
          monthlySalaries: Number(overhead.monthlySalaries) || 0,
          otherMonthly: Number(overhead.otherMonthly) || 0,
          avgShippingCost: Number(overhead.avgShippingCost) || 0,
        })
        toast.success('Overhead settings saved!')
      }

      if (step === 5) {
        navigate('/')
      } else {
        setStep(s => s + 1)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const skip = () => {
    if (step === 5) navigate('/')
    else setStep(s => s + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2563EB] font-mono">Brand OS</h1>
          <p className="text-slate-500 mt-2">Let's set up your Brand OS in a few steps</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-between mb-8 bg-white rounded-2xl p-4 shadow-sm">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div className={cn(
                'flex items-center justify-center h-9 w-9 rounded-full text-sm font-bold transition-all duration-200',
                step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-400'
              )}>
                {step > s.id ? <CheckCircle size={18} /> : s.id}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('h-0.5 w-8 sm:w-16 mx-1', step > s.id ? 'bg-green-500' : 'bg-slate-200')} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 1 && (
            <StepCard icon={Store} title="Connect Shopify" description="Enter your Shopify store URL to sync products and orders automatically.">
              <Input label="Shopify Store URL" value={shopifyUrl} onChange={e => setShopifyUrl(e.target.value)} placeholder="yourstore.myshopify.com" />
            </StepCard>
          )}

          {step === 2 && (
            <StepCard icon={BarChart3} title="Connect Windsor.ai" description="Windsor.ai unifies your Meta and TikTok advertising data into one API.">
              <Input label="Windsor.ai API Key" value={windsorKey} onChange={e => setWindsorKey(e.target.value)} placeholder="wai_xxxxxxxxxxxxxxxx" type="password" />
            </StepCard>
          )}

          {step === 3 && (
            <StepCard icon={Truck} title="Connect Couriers" description="Connect Aramex and/or Bosta to track shipments and COD collection.">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-700">Aramex (optional)</p>
                <Input label="Username" value={aramex.username} onChange={e => setAramex(a => ({ ...a, username: e.target.value }))} placeholder="aramex@yourbrand.com" />
                <Input label="Password" type="password" value={aramex.password} onChange={e => setAramex(a => ({ ...a, password: e.target.value }))} placeholder="••••••••" />
                <Input label="Account Number" value={aramex.accountNumber} onChange={e => setAramex(a => ({ ...a, accountNumber: e.target.value }))} placeholder="12345678" />
                <Input label="Account PIN" type="password" value={aramex.accountPin} onChange={e => setAramex(a => ({ ...a, accountPin: e.target.value }))} placeholder="••••" />
                <p className="text-sm font-semibold text-slate-700 pt-2">Bosta (optional)</p>
                <Input label="Bosta API Key" type="password" value={bostaKey} onChange={e => setBostaKey(e.target.value)} placeholder="bosta_xxxxxxxx" />
              </div>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard icon={Package} title="Product COGS" description="You can enter COGS per product from the Inventory page later. Skip this step to proceed.">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                Product COGS can be configured individually from the Inventory module after setup. Click "Continue" to proceed.
              </div>
            </StepCard>
          )}

          {step === 5 && (
            <StepCard icon={DollarSign} title="Overhead Settings" description="These values feed the BEROAS (Breakeven ROAS) engine to calculate true profitability.">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Monthly Rent (EGP)" type="number" value={overhead.monthlyRent} onChange={e => setOverhead(o => ({ ...o, monthlyRent: e.target.value }))} placeholder="0" />
                <Input label="Monthly Salaries (EGP)" type="number" value={overhead.monthlySalaries} onChange={e => setOverhead(o => ({ ...o, monthlySalaries: e.target.value }))} placeholder="0" />
                <Input label="Other Monthly (EGP)" type="number" value={overhead.otherMonthly} onChange={e => setOverhead(o => ({ ...o, otherMonthly: e.target.value }))} placeholder="0" />
                <Input label="Avg Shipping Cost (EGP)" type="number" value={overhead.avgShippingCost} onChange={e => setOverhead(o => ({ ...o, avgShippingCost: e.target.value }))} placeholder="50" />
              </div>
            </StepCard>
          )}

          <div className="flex items-center justify-between mt-8">
            <Button variant="ghost" onClick={skip}>Skip step</Button>
            <Button onClick={submitStep} loading={loading}>
              {step === 5 ? 'Finish Setup' : 'Continue'}
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ icon: Icon, title, description, children }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-blue-50">
          <Icon size={24} className="text-[#2563EB]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
