import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import {
  calculateProductBEROAS,
  calculateBlendedBEROAS,
  calculateOverheadPerUnit,
} from '../lib/beroas'

const router = Router()
router.use(authenticate)

router.get('/calculate', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const overhead = await prisma.overheadSettings.findUnique({ where: { brandId } })
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const orders = await prisma.order.findMany({
      where: { brandId, createdAt: { gte: monthStart } },
      include: { items: true },
    })

    const unitsSoldThisMonth = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)

    const overheadPerUnit = overhead
      ? calculateOverheadPerUnit({
          monthlyRent: overhead.monthlyRent,
          monthlySalaries: overhead.monthlySalaries,
          otherMonthly: overhead.otherMonthly,
          unitsSoldThisMonth,
        })
      : 0

    const avgShippingCost = overhead?.avgShippingCost ?? 0

    const products = await prisma.product.findMany({ where: { brandId } })
    const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0)

    const productBeroas = products.map((p) => {
      const { grossProfit, marginPct, beRoas } = calculateProductBEROAS({
        sellingPrice: p.sellingPrice,
        cogs: p.costPrice,
        avgShippingCost,
        overheadPerUnit,
      })
      const productRevenue = orders
        .flatMap((o) => o.items)
        .filter((i) => i.productId === p.id)
        .reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      const revenueShare = totalRevenue > 0 ? productRevenue / totalRevenue : 0
      return { productId: p.id, title: p.title, sku: p.sku, grossProfit, marginPct, beRoas, revenueShare }
    })

    const blendedBeroas = calculateBlendedBEROAS(productBeroas)

    res.json({ success: true, data: { blendedBeroas: Math.round(blendedBeroas * 100) / 100, overheadPerUnit: Math.round(overheadPerUnit * 100) / 100, unitsSoldThisMonth, avgShippingCost } })
  } catch (error) {
    console.error('BEROAS calculate error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/products', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const q = req.query as Record<string, string>
    const overhead = await prisma.overheadSettings.findUnique({ where: { brandId } })

    const rent = q.rent !== undefined ? parseFloat(q.rent) : (overhead?.monthlyRent ?? 0)
    const salaries = q.salaries !== undefined ? parseFloat(q.salaries) : (overhead?.monthlySalaries ?? 0)
    const otherFixed = q.otherFixed !== undefined ? parseFloat(q.otherFixed) : (overhead?.otherMonthly ?? 0)
    const avgShipping = q.avgShippingCost !== undefined ? parseFloat(q.avgShippingCost) : (overhead?.avgShippingCost ?? 0)
    const unitsSold = q.unitsSoldMonth !== undefined ? parseFloat(q.unitsSoldMonth) : (() => {
      // fallback: count from DB
      return 100 // default if not provided
    })()

    const overheadPerUnit = calculateOverheadPerUnit({
      monthlyRent: rent, monthlySalaries: salaries, otherMonthly: otherFixed, unitsSoldThisMonth: unitsSold,
    })

    const products = await prisma.product.findMany({ where: { brandId } })

    const result = products.map((p) => {
      const { grossProfit, marginPct, beRoas } = calculateProductBEROAS({
        sellingPrice: p.sellingPrice,
        cogs: p.costPrice,
        avgShippingCost: avgShipping,
        overheadPerUnit,
      })
      return {
        id: p.id, title: p.title, sku: p.sku, size: p.size, color: p.color,
        sellingPrice: p.sellingPrice, costPrice: p.costPrice,
        grossProfit: Math.round(grossProfit * 100) / 100,
        marginPct: Math.round(marginPct * 10000) / 100,
        beRoas: beRoas === Infinity ? 999 : Math.round(beRoas * 100) / 100,
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('BEROAS products error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
