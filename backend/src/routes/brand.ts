import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  language: z.enum(['en', 'ar']).optional(),
  currency: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

router.get('/', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) {
      res.status(404).json({ success: false, error: 'No brand associated with this account' })
      return
    }
    const brand = await prisma.brand.findUnique({ where: { id: brandId } })
    if (!brand) {
      res.status(404).json({ success: false, error: 'Brand not found' })
      return
    }
    res.json({ success: true, data: brand })
  } catch (error) {
    console.error('Get brand error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.put('/', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) {
      res.status(404).json({ success: false, error: 'No brand associated with this account' })
      return
    }
    const parsed = updateBrandSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors })
      return
    }
    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: parsed.data,
    })
    res.json({ success: true, data: brand })
  } catch (error) {
    console.error('Update brand error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
