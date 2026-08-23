import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

export interface AuthUser {
  id: string
  email: string
  brandId: string | null
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    res.status(500).json({ success: false, error: 'Server configuration error' })
    return
  }

  try {
    const raw = jwt.verify(token, secret, { algorithms: ['HS256'] })
    if (typeof raw !== 'object' || !raw || typeof (raw as Record<string, unknown>).id !== 'string' || typeof (raw as Record<string, unknown>).email !== 'string') {
      res.status(401).json({ success: false, error: 'Malformed token' })
      return
    }
    const p = raw as Record<string, unknown>
    const userId = p.id as string
    const email = p.email as string

    const brandId = p.brandId as string | null
    const tokenRole = p.role as string | undefined

    const resolveRole = (fallbackBrandId: string | null) => {
      if (tokenRole) return Promise.resolve(tokenRole)
      // Old tokens without role — look up from DB
      return prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
        .then(u => u?.role ?? 'viewer')
    }

    if (brandId) {
      prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } })
        .then(async brand => {
          const role = await resolveRole(brand?.id ?? null)
          req.user = { id: userId, email, brandId: brand?.id ?? null, role }
          next()
        })
        .catch(() => {
          res.status(401).json({ success: false, error: 'Brand not found' })
        })
    } else {
      prisma.brand.findFirst({ where: { users: { some: { id: userId } } }, select: { id: true } })
        .then(async brand => {
          const role = await resolveRole(brand?.id ?? null)
          req.user = { id: userId, email, brandId: brand?.id ?? null, role }
          next()
        })
        .catch(() => {
          res.status(401).json({ success: false, error: 'Brand not found' })
        })
    }
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}
