import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/stats', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [orders, posOrders, expenses, shipments, products, insights] = await Promise.all([
      prisma.order.findMany({ where: { brandId, createdAt: { gte: startOfMonth } }, select: { totalAmount: true, paymentMethod: true } }),
      prisma.posOrder.findMany({ where: { brandId, createdAt: { gte: startOfMonth } }, select: { finalAmount: true } }),
      prisma.expense.findMany({ where: { brandId, date: { gte: startOfMonth } }, select: { amount: true } }),
      prisma.shipment.findMany({ where: { brandId }, select: { status: true, codAmount: true, codStatus: true, codCollectedAt: true } }),
      prisma.product.findMany({ where: { brandId }, select: { stockWarehouse: true, stockShopify: true, stockPhysical: true, lowStockThreshold: true } }),
      prisma.aiInsight.count({ where: { brandId, isRead: false } }),
    ])

    const revenueMtd = orders.reduce((s, o) => s + o.totalAmount, 0) + posOrders.reduce((s, o) => s + o.finalAmount, 0)
    const expensesMtd = expenses.reduce((s, e) => s + e.amount, 0)
    const profitMtd = revenueMtd - expensesMtd
    const marginMtd = revenueMtd > 0 ? (profitMtd / revenueMtd) * 100 : 0
    const codPending = shipments.filter(s => s.codStatus === 'pending').reduce((s, sh) => s + sh.codAmount, 0)
    const ordersMtd = orders.length + posOrders.length

    const lowStockCount = products.filter(p => {
      const total = p.stockWarehouse + p.stockShopify + p.stockPhysical
      return total > 0 && total <= p.lowStockThreshold
    }).length
    const outOfStockCount = products.filter(p => p.stockWarehouse + p.stockShopify + p.stockPhysical === 0).length
    const inTransitCount = shipments.filter(s => s.status === 'in_transit').length
    const failedCount = shipments.filter(s => s.status === 'failed').length
    const codUncollected = shipments.filter(s => s.codStatus === 'pending').reduce((s, sh) => s + sh.codAmount, 0)
    const roasStatus = 'above'

    res.json({
      success: true,
      data: {
        revenueMtd, expensesMtd, profitMtd, marginMtd, codPending, ordersMtd,
        lowStockCount, outOfStockCount, inTransitCount, failedCount,
        codUncollected, roasStatus,
        unreadInsights: insights,
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
