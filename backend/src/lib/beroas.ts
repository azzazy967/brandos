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
