import { Router } from 'express'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

function getDateRange(req: { query: Record<string, string> }) {
  const { from, to, period } = req.query
  if (from && to) return { gte: new Date(from), lte: new Date(to) }
  const now = new Date()
  const days = period === '7d' ? 7 : period === 'today' ? 1 : 30
  return { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), lte: now }
}

router.get('/summary', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const dateRange = getDateRange(req as any)
    const { platform } = req.query as Record<string, string>

    const where: Record<string, unknown> = { brandId, date: dateRange }
    if (platform && platform !== 'all') where.platform = platform

    const snapshots = await prisma.marketingSnapshot.findMany({ where })

    const totalSpend = snapshots.reduce((s, sn) => s + sn.spend, 0)
    const totalRevenue = snapshots.reduce((s, sn) => s + sn.revenue, 0)
    const totalOrders = snapshots.reduce((s, sn) => s + sn.orders, 0)
    const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0
    const cpa = totalOrders > 0 ? totalSpend / totalOrders : 0

    res.json({ success: true, data: { totalSpend, totalRevenue, blendedRoas: Math.round(blendedRoas * 100) / 100, totalOrders, cpa: Math.round(cpa * 100) / 100 } })
  } catch (error) {
    console.error('Marketing summary error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/campaigns', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const dateRange = getDateRange(req as any)
    const { platform } = req.query as Record<string, string>

    const where: Record<string, unknown> = { brandId, date: dateRange, campaignId: { not: null } }
    if (platform && platform !== 'all') where.platform = platform

    const snapshots = await prisma.marketingSnapshot.findMany({ where })

    const campaignMap = new Map<string, { campaignId: string; campaignName: string | null; platform: string; spend: number; revenue: number; orders: number; impressions: number; clicks: number }>()

    for (const sn of snapshots) {
      if (!sn.campaignId) continue
      const key = sn.campaignId
      const existing = campaignMap.get(key)
      if (existing) {
        existing.spend += sn.spend
        existing.revenue += sn.revenue
        existing.orders += sn.orders
        existing.impressions += sn.impressions
        existing.clicks += sn.clicks
      } else {
        campaignMap.set(key, { campaignId: sn.campaignId, campaignName: sn.campaignName, platform: sn.platform, spend: sn.spend, revenue: sn.revenue, orders: sn.orders, impressions: sn.impressions, clicks: sn.clicks })
      }
    }

    const campaigns = Array.from(campaignMap.values()).map((c) => ({
      ...c,
      roas: c.spend > 0 ? Math.round((c.revenue / c.spend) * 100) / 100 : 0,
      cpa: c.orders > 0 ? Math.round((c.spend / c.orders) * 100) / 100 : 0,
    }))

    res.json({ success: true, data: campaigns })
  } catch (error) {
    console.error('Campaigns error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/creatives', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const dateRange = getDateRange(req as any)
    const snapshots = await prisma.marketingSnapshot.findMany({ where: { brandId, date: dateRange, adId: { not: null } } })

    const adMap = new Map<string, { adId: string; platform: string; creativeUrl: string | null; spend: number; revenue: number; orders: number; clicks: number; impressions: number }>()

    for (const sn of snapshots) {
      if (!sn.adId) continue
      const existing = adMap.get(sn.adId)
      if (existing) {
        existing.spend += sn.spend
        existing.revenue += sn.revenue
        existing.orders += sn.orders
        existing.clicks += sn.clicks
        existing.impressions += sn.impressions
      } else {
        adMap.set(sn.adId, { adId: sn.adId, platform: sn.platform, creativeUrl: sn.creativeUrl, spend: sn.spend, revenue: sn.revenue, orders: sn.orders, clicks: sn.clicks, impressions: sn.impressions })
      }
    }

    const creatives = Array.from(adMap.values())
      .map((c) => ({ ...c, roas: c.spend > 0 ? Math.round((c.revenue / c.spend) * 100) / 100 : 0, ctr: c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 10000) / 100 : 0 }))
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 12)

    res.json({ success: true, data: creatives })
  } catch (error) {
    console.error('Creatives error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/attribution', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const products = await prisma.product.findMany({ where: { brandId }, include: { orderItems: { include: { order: true } } } })

    const data = products.map((p) => {
      const totalRevenue = p.orderItems.reduce((s, oi) => s + oi.quantity * oi.unitPrice, 0)
      const adRevenue = p.orderItems.filter((oi) => oi.order.source === 'shopify').reduce((s, oi) => s + oi.quantity * oi.unitPrice, 0)
      const organicRevenue = totalRevenue - adRevenue
      return { productId: p.id, title: p.title, sku: p.sku, adRevenue: Math.round(adRevenue * 100) / 100, organicRevenue: Math.round(organicRevenue * 100) / 100, totalRevenue: Math.round(totalRevenue * 100) / 100, adPct: totalRevenue > 0 ? Math.round((adRevenue / totalRevenue) * 100) : 0 }
    })

    res.json({ success: true, data })
  } catch (error) {
    console.error('Attribution error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
