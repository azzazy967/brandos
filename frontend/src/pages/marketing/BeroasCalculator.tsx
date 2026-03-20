import { useState, useEffect } from 'react'
import { Calculator } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { calculateProductBEROAS, calculateOverheadPerUnit } from '@/lib/beroas'
import { BeRoasIndicator } from '@/components/shared/BeRoasIndicator'

interface BeroasProduct {
  id: string; title: string; sku: string; sellingPrice: number; costPrice: number
  currentRoas?: number; beRoas?: number; marginPct?: number; roasGap?: number
}

export default function BeroasCalculator() {
  const [sellingPrice, setSellingPrice] = useState('500')
  const [cogs, setCogs] = useState('150')
  const [avgShipping, setAvgShipping] = useState('50')
  const [monthlyRent, setMonthlyRent] = useState('0')
  const [monthlySalaries, setMonthlySalaries] = useState('0')
  const [otherMonthly, setOtherMonthly] = useState('0')
  const [unitsSold, setUnitsSold] = useState('200')
  const [products, setProducts] = useState<BeroasProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<BeroasProduct[]>('/beroas/products'),
      api.get<{ monthlyRent: number; monthlySalaries: number; otherMonthly: number; avgShippingCost: number }>('/settings/overhead'),
    ]).then(([prods, overhead]) => {
      setProducts(prods)
      setMonthlyRent(String(overhead.monthlyRent))
      setMonthlySalaries(String(overhead.monthlySalaries))
      setOtherMonthly(String(overhead.otherMonthly))
      setAvgShipping(String(overhead.avgShippingCost))
    }).catch(() => toast.error('Failed to load BEROAS data'))
    .finally(() => setLoading(false))
  }, [])

  const overheadPerUnit = calculateOverheadPerUnit({
    monthlyRent: Number(monthlyRent) || 0,
    monthlySalaries: Number(monthlySalaries) || 0,
    otherMonthly: Number(otherMonthly) || 0,
    unitsSoldThisMonth: Number(unitsSold) || 1,
  })

  const result = calculateProductBEROAS({
    sellingPrice: Number(sellingPrice) || 0,
    cogs: Number(cogs) || 0,
    avgShippingCost: Number(avgShipping) || 0,
    overheadPerUnit,
  })

  const columns: ColumnDef<BeroasProduct>[] = [
    { key: 'sku', header: 'SKU', render: p => <span className="font-mono text-xs">{p.sku}</span> },
    { key: 'title', header: 'Product', render: p => <p className="font-medium text-sm">{p.title}</p> },
    { key: 'sellingPrice', header: 'Price', render: p => <span className="font-mono">{formatCurrency(p.sellingPrice)}</span> },
    { key: 'marginPct', header: 'Margin %', sortable: true, render: p => p.marginPct !== undefined ? (
      <span className={`font-semibold ${(p.marginPct ?? 0) >= 30 ? 'text-green-600' : (p.marginPct ?? 0) >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
        {formatPercent(p.marginPct)}
      </span>
    ) : <span className="text-slate-400">—</span> },
    { key: 'beRoas', header: 'BEROAS', sortable: true, render: p => p.beRoas ? <span className="font-mono font-semibold">{p.beRoas.toFixed(2)}x</span> : <span className="text-slate-400">—</span> },
    { key: 'currentRoas', header: 'Current ROAS', sortable: true, render: p => p.currentRoas && p.beRoas ? (
      <BeRoasIndicator actualRoas={p.currentRoas} beRoas={p.beRoas} showDetails={false} />
    ) : <span className="text-slate-400">—</span> },
    { key: 'roasGap', header: 'Gap', sortable: true, render: p => p.roasGap !== undefined ? (
      <span className={`font-mono font-semibold ${(p.roasGap ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {(p.roasGap ?? 0) >= 0 ? '+' : ''}{p.roasGap?.toFixed(2)}x
      </span>
    ) : <span className="text-slate-400">—</span> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">BEROAS Calculator</h1>
        <p className="text-slate-500 text-sm mt-1">Calculate your breakeven return on ad spend</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator size={18} /> Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</p>
              <Input label="Selling Price (EGP)" type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} min="0" />
              <Input label="COGS per unit (EGP)" type="number" value={cogs} onChange={e => setCogs(e.target.value)} min="0" />
              <Input label="Avg Shipping Cost (EGP)" type="number" value={avgShipping} onChange={e => setAvgShipping(e.target.value)} min="0" />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Monthly Overhead</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Rent (EGP)" type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} min="0" />
                <Input label="Salaries (EGP)" type="number" value={monthlySalaries} onChange={e => setMonthlySalaries(e.target.value)} min="0" />
                <Input label="Other Fixed (EGP)" type="number" value={otherMonthly} onChange={e => setOtherMonthly(e.target.value)} min="0" />
                <Input label="Units Sold/Month" type="number" value={unitsSold} onChange={e => setUnitsSold(e.target.value)} min="1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Results</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Your current breakeven ROAS is</p>
              <p className="text-5xl font-bold font-mono text-[#2563EB]">
                {isFinite(result.beRoas) ? result.beRoas.toFixed(2) : '∞'}x
              </p>
              <p className="text-sm text-blue-500 mt-2">You need to earn {isFinite(result.beRoas) ? result.beRoas.toFixed(2) : '∞'} EGP for every 1 EGP spent on ads to break even</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Overhead/unit', value: `EGP ${overheadPerUnit.toFixed(2)}` },
                { label: 'Gross Profit/unit', value: formatCurrency(result.grossProfit), color: result.grossProfit >= 0 ? 'text-green-600' : 'text-red-600' },
                { label: 'Margin %', value: formatPercent(result.marginPct * 100), color: result.marginPct >= 0.3 ? 'text-green-600' : result.marginPct >= 0.2 ? 'text-amber-600' : 'text-red-600' },
                { label: 'Breakeven ROAS', value: `${isFinite(result.beRoas) ? result.beRoas.toFixed(2) : '∞'}x`, color: 'text-[#2563EB]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`font-mono font-bold text-lg ${color ?? 'text-slate-900'}`}>{value}</p>
                </div>
              ))}
            </div>

            {result.marginPct < 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700 font-medium">Warning: Negative margin — this product loses money even without ads</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Per-Product BEROAS Table</h2>
        <DataTable
          data={products}
          columns={columns}
          loading={loading}
          exportFilename="beroas-products"
          emptyTitle="No product data"
          emptyDescription="Connect Shopify and enter COGS to see per-product BEROAS."
        />
      </div>
    </div>
  )
}
