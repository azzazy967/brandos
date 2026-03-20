import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/orders', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { status, source, from, to, page = '1', limit = '50' } = req.query as Record<string, string>
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
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    })
    res.json({ success: true, data: orders })
  } catch (error) {
    console.error('Orders error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/shipments', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { courier, status, page = '1', limit = '50' } = req.query as Record<string, string>
    const where: Record<string, unknown> = { brandId }
    if (courier) where.courier = courier
    if (status) where.status = status

    const shipments = await prisma.shipment.findMany({
      where,
      include: { order: { include: { items: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
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
    res.json({ success: true, data: shipments })
  } catch (error) {
    console.error('Failed deliveries error:', error)
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
