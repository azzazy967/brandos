import { useState, useEffect, useRef, useCallback } from 'react'
import { Calculator, Package } from 'lucide-react'
import { DataTable, ColumnDef } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from '@/stores/toast-store'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { calculateProductBEROAS, calculateOverheadPerUnit } from '@/lib/beroas'
import { Link } from 'react-router-dom'

interface BeroasProduct {
  id: string; title: string; sku: string; size: string | null; color: string | null
  sellingPrice: number; costPrice: number; grossProfit: number; marginPct: number; beRoas: number
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
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchProducts = useCallback((rent: string, salaries: string, other: string, units: string, shipping: string) => {
    const params = new URLSearchParams({
      rent, salaries, otherFixed: other, unitsSoldMonth: units, avgShippingCost: shipping,
    })
    api.get<BeroasProduct[]>(`/beroas/products?${params}`)
      .then(data => setProducts(data ?? []))
      .catch(() => toast.error('Failed to load product BEROAS'))
      .finally(() => setLoading(false))
  }, [])

  // Initial load — get overhead settings first
  useEffect(() => {
    api.get<{ monthlyRent: number; monthlySalaries: number; otherMonthly: number; avgShippingCost: number }>('/settings/overhead')
      .then(oh => {
        const o = oh ?? { monthlyRent: 0, monthlySalaries: 0, otherMonthly: 0, avgShippingCost: 0 }
        setMonthlyRent(String(o.monthlyRent))
        setMonthlySalaries(String(o.monthlySalaries))
        setOtherMonthly(String(o.otherMonthly))
        setAvgShipping(String(o.avgShippingCost))
        fetchProducts(String(o.monthlyRent), String(o.monthlySalaries), String(o.otherMonthly), unitsSold, String(o.avgShippingCost))
      })
      .catch(() => {
        fetchProducts('0', '0', '0', unitsSold, '50')
      })
  }, []) // eslint-disable-line

  // Debounced refetch when inputs change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetchProducts(monthlyRent, monthlySalaries, otherMonthly, unitsSold, avgShipping)
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [monthlyRent, monthlySalaries, otherMonthly, unitsSold, avgShipping, fetchProducts])

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

  const filtered = search
    ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    : products

  const hasCostPrices = products.some(p => p.costPrice > 0)

  const columns: ColumnDef<BeroasProduct>[] = [
    { key: 'title', header: 'Product', sortable: true, render: p => <p className="font-medium text-sm">{p.title}</p> },
    { key: 'sku', header: 'SKU', render: p => <span className="font-mono text-xs">{p.sku}</span> },
    { key: 'size', header: 'Size/Color', render: p => (
      <span className="text-xs text-slate-500 dark:text-slate-400">{[p.size, p.color].filter(Boolean).join(' / ') || '—'}</span>
    )},
    { key: 'sellingPrice', header: 'Selling Price', render: p => <span className="font-mono">{formatCurrency(p.sellingPrice)}</span> },
    { key: 'costPrice', header: 'COGS', render: p => <span className="font-mono">{formatCurrency(p.costPrice)}</span> },
    { key: 'grossProfit', header: 'Gross Profit/unit', sortable: true, render: p => (
      <span className={`font-mono font-semibold ${p.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {formatCurrency(p.grossProfit)}
      </span>
    )},
    { key: 'marginPct', header: 'Margin %', sortable: true, render: p => (
      <span className={`font-semibold ${p.marginPct >= 30 ? 'text-green-600 dark:text-green-400' : p.marginPct >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
        {p.marginPct.toFixed(1)}%
      </span>
    )},
    { key: 'beRoas', header: 'Breakeven ROAS', sortable: true, render: p => (
      <span className={`font-mono font-bold ${p.beRoas < 2 ? 'text-green-600 dark:text-green-400' : p.beRoas <= 3.5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
        {p.beRoas >= 999 ? '∞' : `${p.beRoas.toFixed(2)}x`}
      </span>
    )},
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BEROAS Calculator</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Calculate your breakeven return on ad spend</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calculator size={18} /> Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Product</p>
              <Input label="Selling Price (EGP)" type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} min="0" />
              <Input label="COGS per unit (EGP)" type="number" value={cogs} onChange={e => setCogs(e.target.value)} min="0" />
              <Input label="Avg Shipping Cost (EGP)" type="number" value={avgShipping} onChange={e => setAvgShipping(e.target.value)} min="0" />
            </div>
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Monthly Overhead</p>
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
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 dark:from-blue-900/30 to-blue-100 dark:to-blue-800/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Your current breakeven ROAS is</p>
              <p className="text-5xl font-bold font-mono text-[#2563EB]">
                {isFinite(result.beRoas) ? result.beRoas.toFixed(2) : '∞'}x
              </p>
              <p className="text-sm text-blue-500 dark:text-blue-400 mt-2">You need to earn {isFinite(result.beRoas) ? result.beRoas.toFixed(2) : '∞'} EGP for every 1 EGP spent on ads</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Overhead/unit', value: `EGP ${overheadPerUnit.toFixed(2)}` },
                { label: 'Gross Profit/unit', value: formatCurrency(result.grossProfit), color: result.grossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
                { label: 'Margin %', value: formatPercent(result.marginPct * 100), color: result.marginPct >= 0.3 ? 'text-green-600 dark:text-green-400' : result.marginPct >= 0.2 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
                { label: 'Breakeven ROAS', value: `${isFinite(result.beRoas) ? result.beRoas.toFixed(2) : '∞'}x`, color: 'text-[#2563EB]' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  <p className={`font-mono font-bold text-lg ${color ?? 'text-slate-900 dark:text-slate-100'}`}>{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Per-Product BEROAS</h2>
          <Input placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
        </div>

        {!hasCostPrices && !loading && products.length > 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300">Add your product cost prices</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set cost prices in Inventory to see per-product BEROAS</p>
              <Link to="/inventory">
                <Button variant="secondary" className="mt-4">Go to Inventory</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            loading={loading}
            exportFilename="beroas-products"
            emptyTitle="No products"
            emptyDescription="Add products to see per-product BEROAS analysis."
          />
        )}
      </div>
    </div>
  )
}
