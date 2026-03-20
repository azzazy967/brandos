import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { search, collection, status, page = '1', limit = '50' } = req.query as Record<string, string>
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where: Record<string, unknown> = { brandId }
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }]
    if (collection) where.collection = collection

    const products = await prisma.product.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: { orderItems: { include: { order: true } } },
    })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

    const enriched = products.map((p) => {
      const recentItems = p.orderItems.filter((oi) => new Date(oi.order.createdAt) >= thirtyDaysAgo)
      const unitsSold30d = recentItems.reduce((s, oi) => s + oi.quantity, 0)
      const totalStock = p.stockWarehouse + p.stockShopify + p.stockPhysical
      const dailyAvg = unitsSold30d / 30
      const daysOfStockLeft = dailyAvg > 0 ? Math.round(totalStock / dailyAvg) : null
      const sellThroughPct = unitsSold30d + totalStock > 0 ? Math.round((unitsSold30d / (unitsSold30d + totalStock)) * 100) : 0

      const recentSales60d = p.orderItems.filter((oi) => new Date(oi.order.createdAt) >= sixtyDaysAgo)
      let stockStatus = 'healthy'
      if (totalStock === 0) stockStatus = 'out_of_stock'
      else if (totalStock <= 5) stockStatus = 'critical'
      else if (totalStock <= p.lowStockThreshold) stockStatus = 'low_stock'
      else if (recentSales60d.length === 0) stockStatus = 'dead_stock'

      if (status && stockStatus !== status) return null

      return { ...p, unitsSold30d, daysOfStockLeft, sellThroughPct, totalStock, stockStatus }
    }).filter(Boolean)

    res.json({ success: true, data: enriched })
  } catch (error) {
    console.error('Inventory list error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/restock', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const products = await prisma.product.findMany({
      where: { brandId },
      include: { orderItems: { include: { order: true } } },
    })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const restock = products.map((p) => {
      const recentItems = p.orderItems.filter((oi) => new Date(oi.order.createdAt) >= thirtyDaysAgo)
      const unitsSold30d = recentItems.reduce((s, oi) => s + oi.quantity, 0)
      const dailyAvg = unitsSold30d / 30
      const totalStock = p.stockWarehouse + p.stockShopify + p.stockPhysical
      const suggestedQty = Math.max(0, Math.ceil(dailyAvg * 45) - totalStock)
      const daysOfStockLeft = dailyAvg > 0 ? Math.round(totalStock / dailyAvg) : 999
      if (suggestedQty <= 0) return null
      return { id: p.id, title: p.title, sku: p.sku, collection: p.collection, size: p.size, color: p.color, currentStock: totalStock, avgDailySales: Math.round(dailyAvg * 10) / 10, suggestedQty, daysOfStockLeft }
    }).filter(Boolean)

    res.json({ success: true, data: restock })
  } catch (error) {
    console.error('Restock error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/size-intelligence', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const products = await prisma.product.findMany({
      where: { brandId },
      include: { orderItems: true },
    })

    const collections: Record<string, Record<string, { sold: number; stock: number }>> = {}
    for (const p of products) {
      if (!p.collection || !p.size) continue
      if (!collections[p.collection]) collections[p.collection] = {}
      const sold = p.orderItems.reduce((s, oi) => s + oi.quantity, 0)
      const stock = p.stockWarehouse + p.stockShopify + p.stockPhysical
      if (!collections[p.collection][p.size]) collections[p.collection][p.size] = { sold: 0, stock: 0 }
      collections[p.collection][p.size].sold += sold
      collections[p.collection][p.size].stock += stock
    }

    const result = Object.entries(collections).map(([collection, sizes]) => {
      const totalSold = Object.values(sizes).reduce((s, v) => s + v.sold, 0)
      const sizeData = Object.entries(sizes).map(([size, data]) => {
        const sellThroughPct = (data.sold + data.stock) > 0 ? (data.sold / (data.sold + data.stock)) * 100 : 0
        return { size, unitsSold: data.sold, currentStock: data.stock, sellThroughPct: Math.round(sellThroughPct * 10) / 10 }
      }).sort((a, b) => b.unitsSold - a.unitsSold)
      return { collection, totalSold, sizes: sizeData }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error('Size intelligence error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { brandId } = req.user!
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, brandId: brandId! },
      include: { orderItems: { include: { order: true }, orderBy: { order: { createdAt: 'desc' } }, take: 50 } },
    })
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return }
    res.json({ success: true, data: product })
  } catch (error) {
    console.error('Get product error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const updateProductSchema = z.object({
  costPrice: z.number().positive().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  stockWarehouse: z.number().int().min(0).optional(),
  stockShopify: z.number().int().min(0).optional(),
  stockPhysical: z.number().int().min(0).optional(),
})

router.put('/:id', async (req, res) => {
  try {
    const { brandId } = req.user!
    const parsed = updateProductSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const product = await prisma.product.updateMany({
      where: { id: req.params.id, brandId: brandId! },
      data: parsed.data,
    })
    if (product.count === 0) { res.status(404).json({ success: false, error: 'Product not found' }); return }
    const updated = await prisma.product.findUnique({ where: { id: req.params.id } })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update product error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const transferSchema = z.object({
  productId: z.string(),
  from: z.enum(['warehouse', 'shopify', 'physical']),
  to: z.enum(['warehouse', 'shopify', 'physical']),
  quantity: z.number().int().positive(),
})

router.post('/transfer', async (req, res) => {
  try {
    const { brandId } = req.user!
    const parsed = transferSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }
    const { productId, from, to, quantity } = parsed.data

    const product = await prisma.product.findFirst({ where: { id: productId, brandId: brandId! } })
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return }

    const fieldMap: Record<string, keyof typeof product> = { warehouse: 'stockWarehouse', shopify: 'stockShopify', physical: 'stockPhysical' }
    const fromField = fieldMap[from] as 'stockWarehouse' | 'stockShopify' | 'stockPhysical'
    const toField = fieldMap[to] as 'stockWarehouse' | 'stockShopify' | 'stockPhysical'

    if ((product[fromField] as number) < quantity) {
      res.status(400).json({ success: false, error: 'Insufficient stock at source location' })
      return
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { [fromField]: { decrement: quantity }, [toField]: { increment: quantity } },
    })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Transfer error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
