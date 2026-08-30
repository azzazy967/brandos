import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { calculateBlendedRoas } from '../lib/beroas'

const router = Router()
router.use(authenticate)

function getMtdRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start, end: now }
}

router.get('/summary', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }
    const { start, end } = getMtdRange()

    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [orders, expenses, shipments, lastMonthOrders, lastMonthExpenses, lastMonthPos, trendOrders, trendPosOrders, trendSnapshots, mtdSnapshots] = await Promise.all([
      prisma.order.findMany({ where: { brandId, createdAt: { gte: start, lte: end } } }),
      prisma.expense.findMany({ where: { brandId, date: { gte: start, lte: end } } }),
      prisma.shipment.findMany({ where: { brandId, codStatus: 'pending' } }),
      prisma.order.findMany({ where: { brandId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.expense.findMany({ where: { brandId, date: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.posOrder.findMany({ where: { brandId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.order.findMany({ where: { brandId, createdAt: { gte: thirtyDaysAgo } }, select: { totalAmount: true, createdAt: true } }),
      prisma.posOrder.findMany({ where: { brandId, createdAt: { gte: thirtyDaysAgo } }, select: { finalAmount: true, createdAt: true } }),
      prisma.marketingSnapshot.findMany({ where: { brandId, date: { gte: thirtyDaysAgo } }, select: { spend: true, date: true } }),
      prisma.marketingSnapshot.findMany({ where: { brandId, date: { gte: start, lte: end } }, select: { spend: true } }),
    ])

    const posOrders = await prisma.posOrder.findMany({ where: { brandId, createdAt: { gte: start, lte: end } } })

    // Build revenue trend: daily revenue (orders + POS) vs ad spend (marketing snapshots)
    const trendMap = new Map<string, { revenue: number; adSpend: number }>()

    // Initialize all 30 days so chart has continuous data points
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      trendMap.set(key, { revenue: 0, adSpend: 0 })
    }

    for (const o of trendOrders) {
      const key = new Date(o.createdAt).toISOString().slice(0, 10)
      const entry = trendMap.get(key)
      if (entry) { entry.revenue += o.totalAmount }
    }
    for (const p of trendPosOrders) {
      const key = new Date(p.createdAt).toISOString().slice(0, 10)
      const entry = trendMap.get(key)
      if (entry) { entry.revenue += p.finalAmount }
    }
    for (const s of trendSnapshots) {
      const key = new Date(s.date).toISOString().slice(0, 10)
      const entry = trendMap.get(key)
      if (entry) { entry.adSpend += s.spend }
    }

    const revenueTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date,
        revenue: Math.round(vals.revenue * 100) / 100,
        adSpend: Math.round(vals.adSpend * 100) / 100,
      }))

    const revenueMtd = orders.reduce((s, o) => s + o.totalAmount, 0) + posOrders.reduce((s, o) => s + o.finalAmount, 0)
    const expensesMtd = expenses.reduce((s, e) => s + e.amount, 0)
    const grossProfit = revenueMtd - expensesMtd
    const netProfit = grossProfit
    const marginPct = revenueMtd > 0 ? (grossProfit / revenueMtd) * 100 : 0
    const codPending = shipments.reduce((s, sh) => s + sh.codAmount, 0)

    const revenueLastMonth = lastMonthOrders.reduce((s, o) => s + o.totalAmount, 0) + lastMonthPos.reduce((s, o) => s + o.finalAmount, 0)
    const expensesLastMonth = lastMonthExpenses.reduce((s, e) => s + e.amount, 0)
    const ordersMtd = orders.length + posOrders.length
    const ordersLastMonth = lastMonthOrders.length + lastMonthPos.length
    const profitLastMonth = revenueLastMonth - expensesLastMonth
    const marginLastMonth = revenueLastMonth > 0 ? (profitLastMonth / revenueLastMonth) * 100 : 0

    // Revenue breakdown by channel for current month
    const shopifyRevenue = orders.reduce((s, o) => s + o.totalAmount, 0)
    const posRevenue = posOrders.reduce((s, o) => s + o.finalAmount, 0)
    const currentMonth = now.toLocaleString('en', { month: 'short', year: 'numeric' })
    const lastMonthLabel = lastMonthStart.toLocaleString('en', { month: 'short', year: 'numeric' })
    const lastMonthShopify = lastMonthOrders.reduce((s, o) => s + o.totalAmount, 0)
    const lastMonthPosRev = lastMonthPos.reduce((s, o) => s + o.finalAmount, 0)

    const revenueBreakdown = [
      { month: lastMonthLabel, shopify: Math.round(lastMonthShopify), pos: Math.round(lastMonthPosRev), tiktok: 0 },
      { month: currentMonth, shopify: Math.round(shopifyRevenue), pos: Math.round(posRevenue), tiktok: 0 },
    ]

    // Expense breakdown by category
    const expByCat = new Map<string, number>()
    for (const e of expenses) {
      expByCat.set(e.category, (expByCat.get(e.category) ?? 0) + e.amount)
    }
    const expenseBreakdown = Array.from(expByCat.entries()).map(([category, amount]) => ({
      category, amount: Math.round(amount),
    })).sort((a, b) => b.amount - a.amount)

    // Monthly P&L (current + last month)
    const plTable = [
      {
        month: lastMonthLabel,
        revenue: Math.round(revenueLastMonth),
        expenses: Math.round(expensesLastMonth),
        profit: Math.round(revenueLastMonth - expensesLastMonth),
        marginPct: revenueLastMonth > 0 ? Math.round(((revenueLastMonth - expensesLastMonth) / revenueLastMonth) * 10000) / 100 : 0,
      },
      {
        month: currentMonth,
        revenue: Math.round(revenueMtd),
        expenses: Math.round(expensesMtd),
        profit: Math.round(grossProfit),
        marginPct: Math.round(marginPct * 100) / 100,
      },
    ]

    const adSpendMtd = mtdSnapshots.reduce((sum, m) => sum + m.spend, 0)
    const { blendedRoas, beRoas } = calculateBlendedRoas({ revenue: revenueMtd, netProfit, adSpend: adSpendMtd })

    res.json({ success: true, data: {
      revenueMtd, expensesMtd, grossProfit, netProfit, marginPct: Math.round(marginPct * 100) / 100, codPending,
      revenueLastMonth, expensesLastMonth, ordersMtd, ordersLastMonth,
      marginLastMonth: Math.round(marginLastMonth * 100) / 100,
      blendedRoas, beRoas,
      revenueTrend, revenueBreakdown, expenseBreakdown, plTable,
    } })
  } catch (error) {
    console.error('Finance summary error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/cod', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }
    const { status, from, to } = req.query as Record<string, string>

    const where: Record<string, unknown> = {
      brandId,
      codStatus: { not: 'not_applicable' },
    }
    if (status) where.codStatus = status
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    const shipments = await prisma.shipment.findMany({
      where,
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    })

    const now = Date.now()
    const records = shipments.map((s) => ({
      id: s.id,
      orderId: s.orderId,
      customerName: s.order?.customerName ?? null,
      amount: s.codAmount,
      courier: s.courier,
      shipmentStatus: s.status,
      codStatus: s.codStatus,
      daysSinceShipped: Math.floor((now - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      shippedAt: s.createdAt,
    }))

    const totalPending = records.filter((r) => r.codStatus === 'pending').reduce((sum, r) => sum + r.amount, 0)
    const totalLost = shipments.filter((s) => s.codStatus === 'lost' || s.status === 'returned').reduce((sum, s) => sum + s.codAmount, 0)
    const { start, end } = getMtdRange()
    const totalCollectedMtd = shipments.filter((s) => s.codStatus === 'collected' && s.codCollectedAt && new Date(s.codCollectedAt) >= start && new Date(s.codCollectedAt) <= end).reduce((sum, s) => sum + s.codAmount, 0)

    res.json({ success: true, data: { records, totalPending, totalCollectedMtd, totalLost } })
  } catch (error) {
    console.error('COD error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/expenses', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }
    const { category, from, to, page = '1', limit: rawLimit = '50' } = req.query as Record<string, string>
    const parsedLimit = Math.min(parseInt(rawLimit) || 50, 500)

    const where: Record<string, unknown> = { brandId }
    if (category) where.category = category
    if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (parseInt(page) - 1) * parsedLimit,
      take: parsedLimit,
    })
    res.json({ success: true, data: { data: expenses, trend: [] } })
  } catch (error) {
    console.error('Expenses list error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const createExpenseSchema = z.object({
  category: z.enum(['production', 'packaging', 'shipping', 'ads', 'salary', 'rent', 'other']),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  isRecurring: z.boolean().optional(),
})

router.post('/expenses', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = createExpenseSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const expense = await prisma.expense.create({
      data: { ...parsed.data, brandId, date: new Date(parsed.data.date), source: 'manual' },
    })
    res.status(201).json({ success: true, data: expense })
  } catch (error) {
    console.error('Create expense error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/profitability', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const products = await prisma.product.findMany({
      where: { brandId },
      include: {
        orderItems: { include: { order: true } },
        posOrderItems: { include: { posOrder: true } },
      },
    })

    const overhead = await prisma.overheadSettings.findUnique({ where: { brandId } })
    const avgShipping = overhead?.avgShippingCost ?? 0

    // Filter to current month for consistency with dashboard/finance summary
    const now = new Date()
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const profitability = products.map((p) => {
      const mtdItems = p.orderItems.filter(oi => new Date(oi.order.createdAt) >= mtdStart)
      const mtdPosItems = p.posOrderItems.filter(pi => new Date(pi.posOrder.createdAt) >= mtdStart)
      const unitsSold = mtdItems.reduce((s, oi) => s + oi.quantity, 0) + mtdPosItems.reduce((s, pi) => s + pi.quantity, 0)
      const revenue = mtdItems.reduce((s, oi) => s + oi.quantity * oi.unitPrice, 0) + mtdPosItems.reduce((s, pi) => s + pi.lineTotal, 0)
      const cogs = unitsSold * p.costPrice
      const shippingTotal = unitsSold * avgShipping
      const grossProfit = revenue - cogs - shippingTotal
      const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0

      // Ad spend attribution from marketing snapshots (MTD)
      const adAttribution = 0 // TODO: compute from MarketingSnapshot when campaign-level attribution is linked

      return { id: p.id, title: p.title, sku: p.sku, unitsSold, revenue: Math.round(revenue * 100) / 100, cogs: Math.round(cogs * 100) / 100, avgShipping, adAttribution, grossProfit: Math.round(grossProfit * 100) / 100, marginPct: Math.round(marginPct * 100) / 100 }
    })

    profitability.sort((a, b) => b.marginPct - a.marginPct)
    res.json({ success: true, data: profitability })
  } catch (error) {
    console.error('Profitability error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
