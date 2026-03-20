import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import prisma from '../lib/prisma'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  name: z.string().optional(),
  brandName: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function signToken(payload: { id: string; email: string; brandId: string | null }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors })
      return
    }
    const { email, password, name, brandName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { brand, user } = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: { name: brandName, email },
      })
      const user = await tx.user.create({
        data: { email, passwordHash, name, brandId: brand.id },
      })
      return { brand, user }
    })

    const token = signToken({ id: user.id, email: user.email, brandId: brand.id })
    res.status(201).json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, brandId: brand.id } } })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors })
      return
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const token = signToken({ id: user.id, email: user.email, brandId: user.brandId })
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email, name: user.name, brandId: user.brandId } } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/google', async (_req, res) => {
  try {
    // Placeholder for Google OAuth token exchange
    res.status(501).json({ success: false, error: 'Google OAuth not yet implemented' })
  } catch (error) {
    console.error('Google OAuth error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
