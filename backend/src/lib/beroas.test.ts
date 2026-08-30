// ponytail: assert-based self-check, no test framework. Run: npx tsx src/lib/beroas.test.ts
import assert from 'node:assert/strict'
import { calculateProductBEROAS, calculateBlendedRoas, getBeroasStatus } from './beroas'

// 25% margin needs 4.0x to break even — the identity the README documents
const p = calculateProductBEROAS({ sellingPrice: 100, cogs: 50, avgShippingCost: 15, overheadPerUnit: 10 })
assert.equal(p.grossProfit, 25)
assert.equal(p.marginPct, 0.25)
assert.equal(p.beRoas, 4)

// blended: 60000 revenue on 15000 spend = 4.0x actual; 29.3% margin => 3.41x target => healthy
const b = calculateBlendedRoas({ revenue: 60000, netProfit: 17580, adSpend: 15000 })
assert.equal(b.blendedRoas, 4)
assert.equal(b.beRoas, 3.41)
assert.equal(b.status, 'healthy')

// under target => critical
assert.equal(calculateBlendedRoas({ revenue: 20000, netProfit: 5860, adSpend: 15000 }).status, 'critical')

// the regression this guards: no ad spend must NOT assert a status, and must not
// emit Infinity for beRoas when margin is zero or negative
const none = calculateBlendedRoas({ revenue: 60000, netProfit: 17580, adSpend: 0 })
assert.equal(none.blendedRoas, 0)
assert.equal(none.status, 'neutral')
const loss = calculateBlendedRoas({ revenue: 1000, netProfit: -200, adSpend: 500 })
assert.equal(loss.beRoas, 0)
assert.equal(loss.status, 'neutral')
assert.equal(Number.isFinite(loss.beRoas), true)

// status boundaries
assert.equal(getBeroasStatus(4, 4), 'healthy')
assert.equal(getBeroasStatus(3.7, 4), 'warning')
assert.equal(getBeroasStatus(3.5, 4), 'critical')

console.log('beroas self-check: all assertions passed')
