export interface BeroasProductParams {
  sellingPrice: number
  cogs: number
  avgShippingCost: number
  overheadPerUnit: number
}

export interface BeroasResult {
  grossProfit: number
  marginPct: number
  beRoas: number
}

export function calculateProductBEROAS(params: BeroasProductParams): BeroasResult {
  const { sellingPrice, cogs, avgShippingCost, overheadPerUnit } = params
  const grossProfit = sellingPrice - cogs - avgShippingCost - overheadPerUnit
  const marginPct = grossProfit / sellingPrice
  const beRoas = marginPct !== 0 ? 1 / marginPct : Infinity
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

export type BeroasStatus = 'above' | 'near' | 'below'

export function getBeroasStatus(actualRoas: number, beRoas: number): BeroasStatus {
  if (actualRoas >= beRoas) return 'above'
  if (actualRoas >= beRoas * 0.9) return 'near'
  return 'below'
}
