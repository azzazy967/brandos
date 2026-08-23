import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { generateInsights } from '../lib/insights'

const router = Router()
router.use(authenticate)

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req) => req.user?.brandId ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
})

router.get('/', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { module, severity, isRead, page = '1', limit: rawLimit = '50' } = req.query as Record<string, string>
    const limit = String(Math.min(parseInt(rawLimit) || 50, 500))
    const where: Record<string, unknown> = { brandId }
    if (module) where.module = module
    if (severity) where.severity = severity
    if (isRead !== undefined) where.isRead = isRead === 'true'

    const insights = await prisma.aiInsight.findMany({
      where,
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    })

    res.json({ success: true, data: insights })
  } catch (error) {
    console.error('Insights list error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/unread-count', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }
    const count = await prisma.aiInsight.count({ where: { brandId, isRead: false } })
    res.json({ success: true, data: { count } })
  } catch (error) {
    console.error('Unread count error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/generate', generateLimiter, async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [products, orders, shipments, expenses, overhead] = await Promise.all([
      prisma.product.findMany({ where: { brandId }, include: { orderItems: { where: { order: { createdAt: { gte: thirtyDaysAgo } } }, include: { order: true } } } }),
      prisma.order.findMany({ where: { brandId, createdAt: { gte: monthStart } } }),
      prisma.shipment.findMany({ where: { brandId } }),
      prisma.expense.findMany({ where: { brandId, date: { gte: monthStart } } }),
      prisma.overheadSettings.findUnique({ where: { brandId } }),
    ])

    const marketingSnapshots = await prisma.marketingSnapshot.findMany({ where: { brandId, date: { gte: thirtyDaysAgo } } })

    const data = {
      inventory: products.map((p) => ({ id: p.id, title: p.title, sku: p.sku, totalStock: p.stockWarehouse + p.stockShopify + p.stockPhysical, unitsSold30d: p.orderItems.reduce((s, oi) => s + oi.quantity, 0) })),
      finance: { revenueMtd: orders.reduce((s, o) => s + o.totalAmount, 0), expensesMtd: expenses.reduce((s, e) => s + e.amount, 0), codPending: shipments.filter((s) => s.codStatus === 'pending').reduce((sum, s) => sum + s.codAmount, 0) },
      marketing: { totalSpend: marketingSnapshots.reduce((s, sn) => s + sn.spend, 0), totalRevenue: marketingSnapshots.reduce((s, sn) => s + sn.revenue, 0) },
      operations: { failedDeliveries: shipments.filter((s) => s.status === 'failed').length, returnedShipments: shipments.filter((s) => s.status === 'returned').length },
      overhead,
    }

    const generated = await generateInsights(data)

    const created = await Promise.all(
      generated.map((ins) =>
        prisma.aiInsight.create({
          data: { brandId, module: ins.module, severity: ins.severity, titleEn: ins.titleEn, titleAr: ins.titleAr, bodyEn: ins.bodyEn, bodyAr: ins.bodyAr },
        })
      )
    )

    res.json({ success: true, data: { generated: created.length, insights: created } })
  } catch (error) {
    console.error('Generate insights error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.put('/read-all', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }
    await prisma.aiInsight.updateMany({ where: { brandId, isRead: false }, data: { isRead: true } })
    res.json({ success: true, data: { updated: true } })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.put('/:id/read', async (req, res) => {
  try {
    const { brandId } = req.user!
    const updated = await prisma.aiInsight.updateMany({
      where: { id: req.params.id, brandId: brandId! },
      data: { isRead: true },
    })
    if (updated.count === 0) { res.status(404).json({ success: false, error: 'Insight not found' }); return }
    res.json({ success: true, data: { updated: true } })
  } catch (error) {
    console.error('Mark read error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
