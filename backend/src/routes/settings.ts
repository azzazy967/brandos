import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { encrypt, decrypt } from '../lib/encryption'

const router = Router()
router.use(authenticate)

router.get('/overhead', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const settings = await prisma.overheadSettings.findUnique({ where: { brandId } })
    res.json({ success: true, data: settings })
  } catch (error) {
    console.error('Get overhead error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const overheadSchema = z.object({
  monthlyRent: z.number().min(0),
  monthlySalaries: z.number().min(0),
  otherMonthly: z.number().min(0),
  avgShippingCost: z.number().min(0),
})

router.put('/overhead', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = overheadSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const settings = await prisma.overheadSettings.upsert({
      where: { brandId },
      update: parsed.data,
      create: { brandId, ...parsed.data },
    })
    res.json({ success: true, data: settings })
  } catch (error) {
    console.error('Update overhead error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/integrations', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const integrations = await prisma.integration.findMany({ where: { brandId } })
    const safe = integrations.map(({ credentials: _, ...rest }) => ({ ...rest, credentials: '[encrypted]' }))
    res.json({ success: true, data: safe })
  } catch (error) {
    console.error('Get integrations error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const integrationSchema = z.object({
  type: z.enum(['shopify', 'windsor', 'aramex', 'bosta']),
  credentials: z.record(z.string()),
})

router.post('/integrations', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = integrationSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const { type, credentials } = parsed.data
    const encryptedCreds = Object.fromEntries(
      Object.entries(credentials).map(([k, v]) => [k, encrypt(v)])
    )

    const existing = await prisma.integration.findFirst({ where: { brandId, type } })
    let integration
    if (existing) {
      integration = await prisma.integration.update({
        where: { id: existing.id },
        data: { credentials: encryptedCreds, status: 'connected' },
      })
    } else {
      integration = await prisma.integration.create({
        data: { brandId, type, credentials: encryptedCreds, status: 'connected' },
      })
    }

    res.json({ success: true, data: { ...integration, credentials: '[encrypted]' } })
  } catch (error) {
    console.error('Create integration error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.delete('/integrations/:id', async (req, res) => {
  try {
    const { brandId } = req.user!
    const result = await prisma.integration.findFirst({ where: { id: req.params.id, brandId: brandId! } })
    if (!result) { res.status(404).json({ success: false, error: 'Integration not found' }); return }

    await prisma.integration.update({ where: { id: req.params.id }, data: { status: 'disconnected' } })
    res.json({ success: true, data: { disconnected: true } })
  } catch (error) {
    console.error('Delete integration error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export { decrypt }
export default router
