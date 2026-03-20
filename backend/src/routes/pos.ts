import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

function generateOrderNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = String(Math.floor(Math.random() * 900) + 100)
  return `POS-${date}-${random}`
}

router.get('/products', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { search, collection } = req.query as Record<string, string>
    const where: Record<string, unknown> = { brandId, stockPhysical: { gt: 0 } }
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }]
    if (collection) where.collection = collection

    const products = await prisma.product.findMany({ where, orderBy: { title: 'asc' } })
    res.json({ success: true, data: products })
  } catch (error) {
    console.error('POS products error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const createPosOrderSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive(), unitPrice: z.number().positive() })),
  paymentMethod: z.enum(['cash', 'card', 'instapay']),
  discountAmount: z.number().min(0).optional(),
  eventId: z.string().optional(),
  notes: z.string().optional(),
})

router.post('/orders', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = createPosOrderSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const { items, paymentMethod, discountAmount = 0, eventId, notes } = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findFirst({ where: { id: item.productId, brandId } })
        if (!product) throw new Error(`Product ${item.productId} not found`)
        if (product.stockPhysical < item.quantity) throw new Error(`Insufficient stock for ${product.title}`)
      }

      const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
      const finalAmount = Math.max(0, totalAmount - discountAmount)

      const order = await tx.posOrder.create({
        data: {
          brandId,
          orderNumber: generateOrderNumber(),
          eventId: eventId ?? null,
          totalAmount,
          discountAmount,
          finalAmount,
          paymentMethod,
          notes: notes ?? null,
          items: {
            create: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.quantity * i.unitPrice })),
          },
        },
        include: { items: { include: { product: true } } },
      })

      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { stockPhysical: { decrement: item.quantity } } })
      }

      if (eventId) {
        for (const item of items) {
          await tx.bazaarInventory.updateMany({
            where: { eventId, productId: item.productId },
            data: { sold: { increment: item.quantity } },
          })
        }
      }

      return order
    })

    res.status(201).json({ success: true, data: result })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    if (msg.includes('Insufficient stock') || msg.includes('not found')) {
      res.status(400).json({ success: false, error: msg })
    } else {
      console.error('POS create order error:', error)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }
})

router.get('/orders', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { eventId, from, to, paymentMethod, page = '1', limit = '50' } = req.query as Record<string, string>
    const where: Record<string, unknown> = { brandId }
    if (eventId) where.eventId = eventId
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from)
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to)
    }

    const orders = await prisma.posOrder.findMany({
      where,
      include: { items: { include: { product: true } }, event: true },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    })
    res.json({ success: true, data: orders })
  } catch (error) {
    console.error('POS orders list error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/orders/:id', async (req, res) => {
  try {
    const { brandId } = req.user!
    const order = await prisma.posOrder.findFirst({
      where: { id: req.params.id, brandId: brandId! },
      include: { items: { include: { product: true } }, event: true },
    })
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return }
    res.json({ success: true, data: order })
  } catch (error) {
    console.error('POS order detail error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const createEventSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(),
  inventory: z.array(z.object({ productId: z.string(), allocated: z.number().int().positive() })).optional(),
})

router.get('/events', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const events = await prisma.bazaarEvent.findMany({
      where: { brandId },
      include: { inventory: { include: { product: true } }, _count: { select: { posOrders: true } } },
      orderBy: { startDate: 'desc' },
    })
    res.json({ success: true, data: events })
  } catch (error) {
    console.error('Events list error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/events', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = createEventSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const { name, location, startDate, inventory = [] } = parsed.data

    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.bazaarEvent.create({
        data: { brandId, name, location: location ?? null, startDate: new Date(startDate) },
      })

      for (const inv of inventory) {
        const product = await tx.product.findFirst({ where: { id: inv.productId, brandId } })
        if (!product) throw new Error(`Product ${inv.productId} not found`)
        if (product.stockWarehouse < inv.allocated) throw new Error(`Insufficient warehouse stock for ${product.title}`)

        await tx.bazaarInventory.create({ data: { eventId: created.id, productId: inv.productId, allocated: inv.allocated } })
        await tx.product.update({ where: { id: inv.productId }, data: { stockWarehouse: { decrement: inv.allocated }, stockPhysical: { increment: inv.allocated } } })
      }

      return tx.bazaarEvent.findUnique({ where: { id: created.id }, include: { inventory: { include: { product: true } } } })
    })

    res.status(201).json({ success: true, data: event })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error'
    if (msg.includes('Insufficient') || msg.includes('not found')) {
      res.status(400).json({ success: false, error: msg })
    } else {
      console.error('Create event error:', error)
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  }
})

router.put('/events/:id/close', async (req, res) => {
  try {
    const { brandId } = req.user!
    const event = await prisma.bazaarEvent.findFirst({ where: { id: req.params.id, brandId: brandId! }, include: { inventory: true, posOrders: true } })
    if (!event) { res.status(404).json({ success: false, error: 'Event not found' }); return }
    if (event.status === 'closed') { res.status(400).json({ success: false, error: 'Event already closed' }); return }

    const totalRevenue = event.posOrders.reduce((s, o) => s + o.finalAmount, 0)

    await prisma.$transaction(async (tx) => {
      for (const inv of event.inventory) {
        const unsold = inv.allocated - inv.sold - inv.returned
        if (unsold > 0) {
          await tx.product.update({ where: { id: inv.productId }, data: { stockWarehouse: { increment: unsold }, stockPhysical: { decrement: unsold } } })
          await tx.bazaarInventory.update({ where: { id: inv.id }, data: { returned: { increment: unsold } } })
        }
      }

      await tx.bazaarEvent.update({
        where: { id: event.id },
        data: { status: 'closed', endDate: new Date(), totalRevenue },
      })
    })

    const updated = await prisma.bazaarEvent.findUnique({ where: { id: event.id }, include: { inventory: { include: { product: true } }, posOrders: true } })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Close event error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/events/:id/summary', async (req, res) => {
  try {
    const { brandId } = req.user!
    const event = await prisma.bazaarEvent.findFirst({
      where: { id: req.params.id, brandId: brandId! },
      include: { inventory: { include: { product: true } }, posOrders: { include: { items: { include: { product: true } } } } },
    })
    if (!event) { res.status(404).json({ success: false, error: 'Event not found' }); return }

    const totalRevenue = event.posOrders.reduce((s, o) => s + o.finalAmount, 0)
    const totalOrders = event.posOrders.length

    const productSales = new Map<string, { title: string; unitsSold: number; revenue: number }>()
    for (const order of event.posOrders) {
      for (const item of order.items) {
        const existing = productSales.get(item.productId)
        if (existing) {
          existing.unitsSold += item.quantity
          existing.revenue += item.lineTotal
        } else {
          productSales.set(item.productId, { title: item.product.title, unitsSold: item.quantity, revenue: item.lineTotal })
        }
      }
    }

    const topSellers = Array.from(productSales.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5)

    res.json({ success: true, data: { event, totalRevenue, totalOrders, topSellers, inventory: event.inventory } })
  } catch (error) {
    console.error('Event summary error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
