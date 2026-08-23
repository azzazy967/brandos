import { Router } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const ALLOWED_SYNC_TYPES = ['shopify', 'orders', 'products', 'inventory', 'marketing'] as const

router.post('/:type', async (req, res) => {
  const { type } = req.params
  if (!ALLOWED_SYNC_TYPES.includes(type as typeof ALLOWED_SYNC_TYPES[number])) {
    res.status(400).json({ success: false, error: 'Invalid sync type' })
    return
  }
  res.json({ success: true, data: { message: 'Sync triggered', type } })
})

export default router
