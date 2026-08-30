export function calculateProductBEROAS(params: {
  sellingPrice: number
  cogs: number
  avgShippingCost: number
  overheadPerUnit: number
}): { grossProfit: number; marginPct: number; beRoas: number } {
  const { sellingPrice, cogs, avgShippingCost, overheadPerUnit } = params
  const grossProfit = sellingPrice - cogs - avgShippingCost - overheadPerUnit
  const marginPct = grossProfit / sellingPrice
  const beRoas = marginPct === 0 ? Infinity : 1 / marginPct
  return { grossProfit, marginPct, beRoas }
}

export function calculateBlendedBEROAS(
  products: Array<{ beRoas: number; revenueShare: number }>
): number {
  return products.reduce((acc, p) => acc + p.beRoas * p.revenueShare, 0)
}

export function calculateOverheadPerUnit(params: {
  monthlyRent: number
  monthlySalaries: number
  otherMonthly: number
  unitsSoldThisMonth: number
}): number {
  const totalMonthlyOverhead =
    params.monthlyRent + params.monthlySalaries + params.otherMonthly
  return totalMonthlyOverhead / Math.max(params.unitsSoldThisMonth, 1)
}

export type BeroasStatus = 'healthy' | 'warning' | 'critical'

export function getBeroasStatus(actualRoas: number, beRoas: number): BeroasStatus {
  if (actualRoas >= beRoas) return 'healthy'
  if (actualRoas >= beRoas * 0.9) return 'warning'
  return 'critical'
}

export function getBeroasColor(status: BeroasStatus): string {
  const colors: Record<BeroasStatus, string> = {
    healthy: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444',
  }
  return colors[status]
}

/**
 * Portfolio-level blended ROAS and its break-even target.
 *
 * beRoas uses the same 1/margin identity as calculateProductBEROAS, applied to
 * the whole book rather than a single SKU: at a 25% net margin you need 4.0x to
 * break even. Returns 0 (not Infinity) when a figure is unknowable — no ad spend
 * means blended ROAS is undefined, and a non-positive margin means no ad spend
 * can break even — so the UI renders a falsy value instead of "Infinityx".
 */
export function calculateBlendedRoas(params: {
  revenue: number
  netProfit: number
  adSpend: number
}): { blendedRoas: number; beRoas: number; status: BeroasStatus | 'neutral' } {
  const { revenue, netProfit, adSpend } = params

  const blendedRoas = adSpend > 0 ? revenue / adSpend : 0
  const margin = revenue > 0 ? netProfit / revenue : 0
  const beRoas = margin > 0 ? 1 / margin : 0

  // Without both figures there is nothing to compare, so don't assert a status.
  const status = adSpend > 0 && beRoas > 0 ? getBeroasStatus(blendedRoas, beRoas) : 'neutral'

  return {
    blendedRoas: Math.round(blendedRoas * 100) / 100,
    beRoas: Math.round(beRoas * 100) / 100,
    status,
  }
}
