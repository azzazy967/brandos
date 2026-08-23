import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireMinRole } from '../middleware/rbac'

const router = Router()
router.use(authenticate)

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'editor', 'viewer']),
  password: z.string().min(8),
})

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
})

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
})

// GET / — List team members
router.get('/', requireMinRole('admin'), async (req, res) => {
  try {
    const { brandId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const users = await prisma.user.findMany({
      where: { brandId },
      select: { id: true, email: true, name: true, role: true, createdAt: true, invitedBy: true },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })
    res.json({ success: true, data: users })
  } catch (error) {
    console.error('List users error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /invite — Invite a new user
router.post('/invite', requireMinRole('admin'), async (req, res) => {
  try {
    const { brandId, id: inviterId } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = inviteSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const { email, name, role, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) { res.status(409).json({ success: false, error: 'Email already in use' }); return }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name, passwordHash, role, brandId, invitedBy: inviterId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    res.status(201).json({ success: true, data: user })
  } catch (error) {
    console.error('Invite user error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT /:userId/role — Change a user's role
router.put('/:userId/role', requireMinRole('admin'), async (req, res) => {
  try {
    const { brandId, id: actorId, role: actorRole } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const parsed = updateRoleSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const target = await prisma.user.findFirst({ where: { id: req.params.userId as string, brandId } })
    if (!target) { res.status(404).json({ success: false, error: 'User not found' }); return }

    if (target.role === 'owner') { res.status(403).json({ success: false, error: "Cannot change the owner's role" }); return }
    if (target.id === actorId) { res.status(403).json({ success: false, error: 'Cannot change your own role' }); return }
    if (actorRole !== 'owner' && target.role === 'admin') {
      res.status(403).json({ success: false, error: 'Only the owner can change an admin\'s role' }); return
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId as string },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    res.json({ success: true, data: user })
  } catch (error) {
    console.error('Update role error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE /:userId — Remove a user
router.delete('/:userId', requireMinRole('admin'), async (req, res) => {
  try {
    const { brandId, id: actorId, role: actorRole } = req.user!
    if (!brandId) { res.status(400).json({ success: false, error: 'No brand' }); return }

    const target = await prisma.user.findFirst({ where: { id: req.params.userId as string, brandId } })
    if (!target) { res.status(404).json({ success: false, error: 'User not found' }); return }

    if (target.role === 'owner') { res.status(403).json({ success: false, error: 'Cannot remove the owner' }); return }
    if (target.id === actorId) { res.status(403).json({ success: false, error: 'Cannot remove yourself' }); return }
    if (actorRole !== 'owner' && target.role === 'admin') {
      res.status(403).json({ success: false, error: 'Only the owner can remove an admin' }); return
    }

    await prisma.user.delete({ where: { id: req.params.userId as string } })
    res.status(204).send()
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT /me/password — Change own password
router.put('/me/password', async (req, res) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.errors }); return }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
    if (!valid) { res.status(401).json({ success: false, error: 'Current password is incorrect' }); return }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    res.json({ success: true, data: { message: 'Password updated' } })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
