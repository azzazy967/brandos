import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  module: z.enum(['inventory', 'finance', 'marketing', 'operations', 'general']).optional(),
  dueDate: z.string().optional(),
  linkedType: z.enum(['order', 'product']).optional(),
  linkedId: z.string().optional(),
})

// GET /summary — KPI counts
router.get('/summary', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000)
    startOfWeek.setHours(0, 0, 0, 0)

    const [totalOpen, overdue, dueToday, completedThisWeek] = await Promise.all([
      prisma.task.count({ where: { brandId, status: { not: 'done' } } }),
      prisma.task.count({ where: { brandId, status: { not: 'done' }, dueDate: { lt: startOfDay } } }),
      prisma.task.count({ where: { brandId, status: { not: 'done' }, dueDate: { gte: startOfDay, lt: endOfDay } } }),
      prisma.task.count({ where: { brandId, status: 'done', completedAt: { gte: startOfWeek } } }),
    ])

    res.json({ success: true, data: { totalOpen, overdue, dueToday, completedThisWeek } })
  } catch (error) {
    console.error('Task summary error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET / — List tasks with filters
router.get('/', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const { status, priority, module, page = '1', limit: rawLimit = '50' } = req.query as Record<string, string>
    const parsedLimit = Math.min(parseInt(rawLimit) || 50, 500)
    const where: Record<string, unknown> = { brandId }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (module) where.module = module

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip: (parseInt(page) - 1) * parsedLimit,
      take: parsedLimit,
    })
    res.json({ success: true, data: tasks })
  } catch (error) {
    console.error('Tasks list error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST / — Create task
router.post('/', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = createTaskSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const { dueDate, ...rest } = parsed.data
    const task = await prisma.task.create({
      data: {
        brandId,
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : null,
        completedAt: rest.status === 'done' ? new Date() : null,
      },
    })
    res.status(201).json({ success: true, data: task })
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT /:id — Update task
router.put('/:id', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const existing = await prisma.task.findFirst({ where: { id: req.params.id, brandId } })
    if (!existing) { res.status(404).json({ success: false, error: 'Task not found' }); return }

    const parsed = createTaskSchema.partial().safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const { dueDate, ...rest } = parsed.data
    const data: Record<string, unknown> = { ...rest }
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null

    // Handle completedAt based on status change
    if (rest.status === 'done' && existing.status !== 'done') {
      data.completedAt = new Date()
    } else if (rest.status && rest.status !== 'done' && existing.status === 'done') {
      data.completedAt = null
    }

    const task = await prisma.task.update({ where: { id: req.params.id }, data })
    res.json({ success: true, data: task })
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT /:id/complete — Toggle complete
router.put('/:id/complete', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const existing = await prisma.task.findFirst({ where: { id: req.params.id, brandId } })
    if (!existing) { res.status(404).json({ success: false, error: 'Task not found' }); return }

    const isDone = existing.status === 'done'
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: isDone ? 'todo' : 'done',
        completedAt: isDone ? null : new Date(),
      },
    })
    res.json({ success: true, data: task })
  } catch (error) {
    console.error('Toggle task error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE /:id — Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const existing = await prisma.task.findFirst({ where: { id: req.params.id, brandId } })
    if (!existing) { res.status(404).json({ success: false, error: 'Task not found' }); return }

    await prisma.task.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
