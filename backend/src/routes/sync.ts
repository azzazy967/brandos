import { Router } from 'express'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

router.post('/:type', async (req, res) => {
  res.json({ success: true, data: { message: 'Sync triggered', type: req.params.type } })
})

export default router
