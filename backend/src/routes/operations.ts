import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/summary', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfDay.getTime() - startOfDay.getDay() * 86400000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [ordersToday, ordersWeek, shipments] = await Promise.all([
      prisma.order.count({ where: { brandId, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { brandId, createdAt: { gte: startOfWeek } } }),
      prisma.shipment.findMany({ where: { brandId }, select: { status: true, createdAt: true, updatedAt: true } }),
    ])

    const deliveredMtd = shipments.filter(s => s.status === 'delivered' && s.updatedAt >= startOfMonth).length
    const failedMtd = shipments.filter(s => s.status === 'failed').length
    const inTransit = shipments.filter(s => s.status === 'in_transit').length
    const returnedCount = shipments.filter(s => s.status === 'returned').length
    const totalDelivered = shipments.filter(s => ['delivered', 'returned'].includes(s.status)).length
    const returnRate = totalDelivered > 0 ? Math.round((returnedCount / totalDelivered) * 100 * 10) / 10 : 0

    res.json({ success: true, data: { ordersToday, ordersWeek, deliveredMtd, failedMtd, inTransit, returnRate } })
  } catch (error) {
    console.error('Operations summary error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/orders', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { status, source, from, to, page = '1', limit: rawLimit = '50' } = req.query as Record<string, string>
    const parsedLimit = Math.min(parseInt(rawLimit) || 50, 500)
    const where: Record<string, unknown> = { brandId }
    if (status) where.status = status
    if (source) where.source = source
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: { include: { product: true } }, shipment: true },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parsedLimit,
      take: parsedLimit,
    })
    const mapped = orders.map(o => ({
      id: o.id,
      source: o.source,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      status: o.status,
      shipmentStatus: o.shipment?.status ?? null,
      codStatus: o.shipment?.codStatus ?? null,
      createdAt: o.createdAt,
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    }))
    res.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Orders error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/shipments', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { courier, status, page = '1', limit: rawLimit = '50' } = req.query as Record<string, string>
    const parsedLimit = Math.min(parseInt(rawLimit) || 50, 500)
    const where: Record<string, unknown> = { brandId }
    if (courier) where.courier = courier
    if (status) where.status = status

    const shipments = await prisma.shipment.findMany({
      where,
      include: { order: { include: { items: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parsedLimit,
      take: parsedLimit,
    })
    res.json({ success: true, data: shipments })
  } catch (error) {
    console.error('Shipments error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/failed', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const shipments = await prisma.shipment.findMany({
      where: { brandId, status: 'failed' },
      include: { order: true },
      orderBy: { updatedAt: 'desc' },
    })
    const mapped = shipments.map(s => ({
      id: s.id,
      orderId: s.orderId,
      customerName: s.order?.customerName ?? null,
      customerPhone: s.order?.customerPhone ?? null,
      courier: s.courier,
      attempts: 1,
      lastAttemptAt: s.updatedAt,
      codAmount: s.codAmount,
      city: null,
      shipmentId: s.id,
    }))
    res.json({ success: true, data: mapped })
  } catch (error) {
    console.error('Failed deliveries error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/shipments/:id/retry', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const shipment = await prisma.shipment.findFirst({ where: { id: req.params.id, brandId } })
    if (!shipment) { res.status(404).json({ success: false, error: 'Shipment not found' }); return }

    const updated = await prisma.shipment.update({ where: { id: req.params.id }, data: { status: 'created' } })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Retry shipment error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.put('/shipments/:id/cancel', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const shipment = await prisma.shipment.findFirst({ where: { id: req.params.id, brandId }, include: { order: true } })
    if (!shipment) { res.status(404).json({ success: false, error: 'Shipment not found' }); return }

    await prisma.$transaction([
      prisma.shipment.update({ where: { id: req.params.id }, data: { status: 'returned' } }),
      prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'cancelled' } }),
    ])
    res.json({ success: true, data: { cancelled: true } })
  } catch (error) {
    console.error('Cancel shipment error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/returns', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const returnedShipments = await prisma.shipment.findMany({
      where: { brandId, status: 'returned' },
      include: { order: { include: { items: { include: { product: true } } } } },
    })

    const productMap = new Map<string, { productId: string; title: string; sku: string; totalOrders: number; returns: number }>()

    for (const sh of returnedShipments) {
      for (const item of sh.order.items) {
        const key = item.productId
        const existing = productMap.get(key)
        if (existing) {
          existing.returns += item.quantity
        } else {
          productMap.set(key, { productId: item.productId, title: item.product.title, sku: item.product.sku, totalOrders: 0, returns: item.quantity })
        }
      }
    }

    const allOrderItems = await prisma.orderItem.findMany({
      where: { order: { brandId } },
      include: { product: true },
    })
    for (const oi of allOrderItems) {
      const entry = productMap.get(oi.productId)
      if (entry) entry.totalOrders += oi.quantity
    }

    const data = Array.from(productMap.values()).map((p) => ({
      ...p,
      returnRate: p.totalOrders > 0 ? Math.round((p.returns / p.totalOrders) * 10000) / 100 : 0,
    }))

    res.json({ success: true, data })
  } catch (error) {
    console.error('Returns error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
